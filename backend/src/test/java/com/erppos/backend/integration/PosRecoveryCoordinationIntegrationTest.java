package com.erppos.backend.integration;

import com.erppos.backend.erp.admin.cleanup.domain.port.ProductCleanupExecutePort;
import com.erppos.backend.erp.billing.domain.port.BillingSaleReadPort;
import com.erppos.backend.erp.sales.domain.port.CashRegisterRepositoryPort;
import com.erppos.backend.erp.sales.domain.port.CheckoutReadPort;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Real PostgreSQL waiters establish the order; gates never substitute for database locks. */
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Timeout(40)
class PosRecoveryCoordinationIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @MockitoSpyBean CheckoutReadPort checkout;
    @MockitoSpyBean CashRegisterRepositoryPort cash;
    @MockitoSpyBean BillingSaleReadPort billingSale;
    @MockitoSpyBean ProductCleanupExecutePort cleanup;
    @MockitoSpyBean com.erppos.backend.erp.sales.domain.port.SalesBillingSummaryReadPort billingSummary;

    record Fixture(String token, long cash, long warehouse, long product, ObjectNode command) {}
    record Gate(CountDownLatch locked, CountDownLatch release, AtomicInteger pid) {}

    @AfterEach void clearSpies() {
        reset(AopTestUtils.getUltimateTargetObject(checkout), AopTestUtils.getUltimateTargetObject(cash),
                AopTestUtils.getUltimateTargetObject(billingSale), AopTestUtils.getUltimateTargetObject(cleanup),
                AopTestUtils.getUltimateTargetObject(billingSummary));
    }

    @Test void closeWaitsForCheckoutAndIncludesItsCommittedCash() throws Exception {
        Fixture f = fixture(); prepare(f);
        Gate gate = gate();
        doAnswer(inv -> { Object result = inv.callRealMethod(); hold(gate); return result; })
                .when(AopTestUtils.<CheckoutReadPort>getUltimateTargetObject(checkout)).lockCatalog(anyList());
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> sale = executor.submit(() -> checkout(f));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> close = executor.submit(() -> close(f));
            awaitBlockedBy(gate.pid().get());
            gate.release().countDown();
            assertEquals(201, sale.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            MvcResult result = close.get(10, TimeUnit.SECONDS);
            assertEquals(200, result.getResponse().getStatus());
            assertEquals(0, BigDecimal.TEN.compareTo(readJson(result).path("expectedCashAmount").decimalValue()));
            assertEquals(1, saleCount(f));
        } finally { stop(gate, executor); }
    }

    @Test void closeWinningTheCashLockRejectsCheckoutAndKeepsPreparation() throws Exception {
        Fixture f = fixture(); prepare(f);
        Gate gate = gate();
        doAnswer(inv -> { Object result = inv.callRealMethod(); hold(gate); return result; })
                .when(AopTestUtils.<CashRegisterRepositoryPort>getUltimateTargetObject(cash)).sumSalesCashPaid(eq(f.cash()));
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> close = executor.submit(() -> close(f));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> sale = executor.submit(() -> checkout(f));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            assertEquals(200, close.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(409, sale.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(0, saleCount(f));
            assertEquals("PREPARED", jdbc.queryForObject("select state from sale_operations where operation_id=?", String.class, operationId(f)));
            assertEquals(0, jdbc.queryForObject("select count(*) from sale_payments p join sales s on s.id=p.sale_id where s.cash_register_session_id=?", Integer.class, f.cash()));
        } finally { stop(gate, executor); }
    }

    @Test void duplicateCreatorsWaitAndReturnTheSameDraftWithoutAnotherNumber() throws Exception {
        Fixture f = fixture(); prepare(f); long sale = complete(f); long series = series("RECEIPT");
        long before = number(series); Gate gate = billingGate();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = executor.submit(() -> document(f, sale, "RECEIPT", series));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> second = executor.submit(() -> document(f, sale, "RECEIPT", series));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            MvcResult a = first.get(10, TimeUnit.SECONDS), b = second.get(10, TimeUnit.SECONDS);
            assertEquals(201, a.getResponse().getStatus()); assertEquals(201, b.getResponse().getStatus());
            assertEquals(readJson(a).path("id"), readJson(b).path("id"));
            assertEquals(before + 1, number(series)); assertEquals(1, documents(sale));
            assertEquals("DRAFT", readJson(a).path("status").asText());
        } finally { stop(gate, executor); }
    }

    @Test void competingReceiptAndInvoiceCannotCreateTwoDocuments() throws Exception {
        Fixture f = fixture(); prepare(f); long sale = complete(f);
        long receipt = series("RECEIPT"), invoice = series("INVOICE");
        long receiptBefore = number(receipt), invoiceBefore = number(invoice); Gate gate = billingGate();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = executor.submit(() -> document(f, sale, "RECEIPT", receipt));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> second = executor.submit(() -> document(f, sale, "INVOICE", invoice));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            assertEquals(201, first.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(409, second.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(1, documents(sale)); assertEquals(receiptBefore + 1, number(receipt)); assertEquals(invoiceBefore, number(invoice));
        } finally { stop(gate, executor); }
    }

    @Test void draftCreationWinningOperationLockBlocksConcurrentVoid() throws Exception {
        Fixture f = fixture(); prepare(f); long sale = complete(f); long series = series("RECEIPT"); Gate gate = billingGate();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> draft = executor.submit(() -> document(f, sale, "RECEIPT", series));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> voiding = executor.submit(() -> request(f.token(), "/api/v1/sales/" + sale + "/void", objectMapper.createObjectNode().put("reason", "Synthetic race")));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            assertEquals(201, draft.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(409, voiding.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals("COMPLETED", jdbc.queryForObject("select status from sales where id=?", String.class, sale));
            assertEquals(1, documents(sale));
        } finally { stop(gate, executor); }
    }

    @Test void voidWinningTheOperationLockPreventsConcurrentDraftAndDoesNotConsumeANumber() throws Exception {
        Fixture f=fixture(); prepare(f); long sale=complete(f), series=series("RECEIPT"), before=number(series);
        Gate gate=gate();
        doAnswer(inv->{inv.callRealMethod();hold(gate);return null;}).when(
                AopTestUtils.<com.erppos.backend.erp.sales.domain.port.SalesBillingSummaryReadPort>getUltimateTargetObject(billingSummary))
                .lockDocumentsForSale(eq(sale));
        ExecutorService executor=Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> voiding=executor.submit(()->request(f.token(),"/api/v1/sales/"+sale+"/void",objectMapper.createObjectNode().put("reason","Synthetic void-first race")));
            assertTrue(gate.locked().await(10,TimeUnit.SECONDS));
            Future<MvcResult> draft=executor.submit(()->document(f,sale,"RECEIPT",series));
            awaitBlockedBy(gate.pid().get());gate.release().countDown();
            assertEquals(200,voiding.get(10,TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(422,draft.get(10,TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals("VOIDED",jdbc.queryForObject("select status from sales where id=?",String.class,sale));
            assertEquals(before,number(series));assertEquals(0,documents(sale));
            assertEquals(1,jdbc.queryForObject("select count(*) from inventory_movements where reference_type='SALE_VOID' and reference_id=?",Integer.class,String.valueOf(sale)));
        }finally{stop(gate,executor);}
    }

    @Test void purgingAPendingReceiptRedactsCustomerDataAndPreservesTheIdentityHash() throws Exception {
        Fixture f=fixture();long series=series("INVOICE");ObjectNode body=preparation(f);
        body.putObject("receiptIntent").put("receiptType","INVOICE").putObject("payload")
                .put("documentType","INVOICE").put("billingSeriesId",series).put("customerName","Synthetic pending customer")
                .put("customerDocument","20123456789");
        assertEquals(201,request(f.token(),"/api/v1/sales/operations",body).getResponse().getStatus());
        complete(f);String hash=jdbc.queryForObject("select intent_hash from sale_operations where operation_id=?",String.class,operationId(f));
        jdbc.update("update products set active=false where id=?",f.product());
        assertEquals(200,purge(f).getResponse().getStatus());
        var row=jdbc.queryForMap("select state,sale_id,intent_hash,receipt_intent->'payload' as payload,command_snapshot from sale_operations where operation_id=?",operationId(f));
        assertEquals("COMPLETED",row.get("state"));assertNull(row.get("sale_id"));assertEquals(hash,row.get("intent_hash"));
        assertTrue(row.get("payload")==null || "null".equals(row.get("payload").toString()));assertNull(row.get("command_snapshot"));
        assertEquals(409,checkout(f).getResponse().getStatus());
    }

    @Test void billingWinningTheLockMakesCleanupRevalidateBeforeAnyDelete() throws Exception {
        Fixture f = fixture(); prepare(f); long sale = complete(f); long series = series("RECEIPT");
        jdbc.update("update products set active=false where id=?", f.product()); Gate gate = billingGate();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> draft = executor.submit(() -> document(f, sale, "RECEIPT", series));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> purge = executor.submit(() -> purge(f));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            assertEquals(201, draft.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            int purgeStatus = purge.get(10, TimeUnit.SECONDS).getResponse().getStatus();
            assertTrue(purgeStatus == 422 || purgeStatus == 409);
            assertEquals(1, saleCount(f)); assertEquals(1, documents(sale));
            assertEquals(1, jdbc.queryForObject("select count(*) from sale_items where sale_id=?", Integer.class, sale));
            assertEquals(1, jdbc.queryForObject("select count(*) from sale_payments where sale_id=?", Integer.class, sale));
        } finally { stop(gate, executor); }
    }

    @Test void cleanupWinningTheLockKeepsTombstoneAndRejectsLateDraft() throws Exception {
        Fixture f = fixture(); prepare(f); long sale = complete(f); long series = series("RECEIPT");
        jdbc.update("update products set active=false where id=?", f.product()); Gate gate = gate();
        doAnswer(inv -> { inv.callRealMethod(); hold(gate); return null; })
                .when(AopTestUtils.<ProductCleanupExecutePort>getUltimateTargetObject(cleanup)).lockCleanupTargets(anySet(), anySet());
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> purge = executor.submit(() -> purge(f));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> draft = executor.submit(() -> document(f, sale, "RECEIPT", series));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            assertEquals(200, purge.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(404, draft.get(10, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(0, saleCount(f)); assertEquals(0, documents(sale));
            assertNull(jdbc.queryForObject("select sale_id from sale_operations where operation_id=?", Long.class, operationId(f)));
            assertEquals("COMPLETED", jdbc.queryForObject("select state from sale_operations where operation_id=?", String.class, operationId(f)));
            assertEquals(409, checkout(f).getResponse().getStatus());
        } finally { stop(gate, executor); }
    }

    @Test void electronicIntentCannotBeChangedAndCompatibleRetryKeepsItsNumber() throws Exception {
        Fixture f = fixture(); long receipt = series("RECEIPT"), invoice = series("INVOICE");
        ObjectNode body = preparation(f);
        ObjectNode intent = body.putObject("receiptIntent").put("receiptType", "RECEIPT");
        intent.putObject("payload").put("documentType", "RECEIPT").put("billingSeriesId", receipt)
                .putNull("customerName").putNull("customerDocument");
        int prepared = request(f.token(), "/api/v1/sales/operations", body).getResponse().getStatus();
        assertTrue(prepared == 200 || prepared == 201);
        long sale = complete(f), before = number(receipt), invoiceBefore = number(invoice);
        assertEquals(409, document(f, sale, "INVOICE", invoice).getResponse().getStatus());
        MvcResult first = document(f, sale, "RECEIPT", receipt), replay = document(f, sale, "RECEIPT", receipt);
        assertEquals(201, first.getResponse().getStatus()); assertEquals(201, replay.getResponse().getStatus());
        assertEquals(readJson(first).path("id"), readJson(replay).path("id"));
        assertEquals(before + 1, number(receipt)); assertEquals(invoiceBefore, number(invoice)); assertEquals(1, documents(sale));
    }

    @Test void anotherSupervisorCannotCreateOrRecoverTheOwnersDocument() throws Exception {
        Fixture f = fixture(); prepare(f); long sale = complete(f), series = series("RECEIPT");
        String other = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);
        ObjectNode body = objectMapper.createObjectNode().put("documentType", "RECEIPT").put("billingSeriesId", series);
        assertEquals(404, request(other, "/api/v1/billing/documents/from-sale/" + sale, body).getResponse().getStatus());
        assertEquals(0, documents(sale));
    }

    private Fixture fixture() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD), suffix = "RA" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        long category = createCategory(token, suffix), unit = createUnit(token, suffix), warehouse = createWarehouse(token, suffix);
        long product = createProduct(token, category, unit, suffix, BigDecimal.TEN);
        registerInitialStock(token, product, warehouse, BigDecimal.TEN, "Synthetic recovery coordination");
        long cash = openCash(token, BigDecimal.ZERO, suffix);
        ObjectNode body = objectMapper.createObjectNode().put("warehouseId", warehouse).put("operationId", UUID.randomUUID().toString()).put("confirmedTotal", 10);
        body.putArray("items").addObject().put("productId", product).put("quantity", 1).put("discountAmount", 0).put("confirmedUnitPrice", 10);
        body.putArray("payments").addObject().put("paymentMethod", "CASH").put("amount", 10);
        return new Fixture(token, cash, warehouse, product, body);
    }
    private void prepare(Fixture f) throws Exception {
        ObjectNode body = preparation(f);
        int status = request(f.token(), "/api/v1/sales/operations", body).getResponse().getStatus(); assertTrue(status == 200 || status == 201);
    }
    private ObjectNode preparation(Fixture f) {
        ObjectNode body = objectMapper.createObjectNode().put("protocolVersion", 1).put("origin", "POS").put("operationId", operationId(f).toString());
        body.set("command", f.command().deepCopy()); body.putObject("receiptIntent").put("receiptType", "TICKET").putNull("payload");
        return body;
    }
    private MvcResult checkout(Fixture f) throws Exception { return request(f.token(), "/api/v1/sales", f.command()); }
    private long complete(Fixture f) throws Exception { MvcResult result = checkout(f); assertEquals(201, result.getResponse().getStatus()); return readJson(result).path("id").asLong(); }
    private MvcResult close(Fixture f) throws Exception { return request(f.token(), "/api/v1/cash-registers/" + f.cash() + "/close", objectMapper.createObjectNode().put("countedAmount", 10)); }
    private MvcResult purge(Fixture f) throws Exception {
        ObjectNode body = objectMapper.createObjectNode().put("confirmationText", "ELIMINAR PRUEBAS"); body.putArray("productIds").add(f.product());
        return request(f.token(), "/api/v1/admin/test-data-cleanup/products/execute", body);
    }
    private MvcResult document(Fixture f, long sale, String type, long series) throws Exception {
        ObjectNode body = objectMapper.createObjectNode().put("documentType", type).put("billingSeriesId", series);
        if (type.equals("INVOICE")) body.put("customerName", "Synthetic customer").put("customerDocument", "20123456789");
        return request(f.token(), "/api/v1/billing/documents/from-sale/" + sale, body);
    }
    private MvcResult request(String token, String path, ObjectNode body) throws Exception {
        return mockMvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, bearer(token)).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andReturn();
    }
    private UUID operationId(Fixture f) { return UUID.fromString(f.command().path("operationId").asText()); }
    private int saleCount(Fixture f) { return jdbc.queryForObject("select count(*) from sales where cash_register_session_id=?", Integer.class, f.cash()); }
    private int documents(long sale) { return jdbc.queryForObject("select count(*) from electronic_documents where sale_id=?", Integer.class, sale); }
    private long number(long series) { return jdbc.queryForObject("select current_number from billing_series where id=?", Long.class, series); }
    private long series(String type) {
        if (jdbc.queryForObject("select count(*) from company_billing_profile where environment='LOCAL' and active", Integer.class) == 0)
            jdbc.update("insert into company_billing_profile(ruc,legal_name,fiscal_address,environment,active,created_by,updated_by) values('20123456789','Synthetic recovery','Synthetic address','LOCAL',true,'qa','qa')");
        var existing = jdbc.queryForList("select id from billing_series where environment='LOCAL' and document_type=? and active order by id", Long.class, type);
        if (!existing.isEmpty()) return existing.get(0);
        String series = (type.equals("RECEIPT") ? "B" : "F") + UUID.randomUUID().toString().replace("-", "").substring(0, 3).toUpperCase();
        return jdbc.queryForObject("insert into billing_series(document_type,series,current_number,environment,active,created_by,updated_by) values(?,?,1,'LOCAL',true,'qa','qa') returning id", Long.class, type, series);
    }
    private Gate billingGate() {
        Gate gate = gate(); AtomicInteger calls = new AtomicInteger();
        doAnswer(inv -> { Object result = inv.callRealMethod(); if (calls.getAndIncrement() == 0) hold(gate); return result; })
                .when(AopTestUtils.<BillingSaleReadPort>getUltimateTargetObject(billingSale)).findByIdForUpdate(anyLong());
        return gate;
    }
    private Gate gate() { return new Gate(new CountDownLatch(1), new CountDownLatch(1), new AtomicInteger()); }
    private void hold(Gate gate) throws InterruptedException {
        gate.pid().set(jdbc.queryForObject("select pg_backend_pid()", Integer.class)); gate.locked().countDown();
        assertTrue(gate.release().await(15, TimeUnit.SECONDS), "Controlled gate timed out");
    }
    private void awaitBlockedBy(int pid) {
        long end = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        while (System.nanoTime() < end) {
            if (Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from pg_stat_activity where wait_event_type='Lock' and ?=any(pg_blocking_pids(pid)))", Boolean.class, pid))) return;
            LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(5));
        }
        fail("Expected a real PostgreSQL waiter blocked by controlled transaction " + pid);
    }
    private void stop(Gate gate, ExecutorService executor) throws InterruptedException {
        gate.release().countDown(); executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
    }
}
