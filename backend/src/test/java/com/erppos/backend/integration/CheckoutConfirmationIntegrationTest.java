package com.erppos.backend.integration;

import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductJpaRepository;
import com.erppos.backend.erp.sales.domain.port.CheckoutReadPort;
import com.erppos.backend.erp.sales.domain.port.InventorySalesPort;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Timeout(45)
class CheckoutConfirmationIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager txManager;
    @Autowired ProductJpaRepository products;
    @MockitoSpyBean CheckoutReadPort checkout;
    @MockitoSpyBean InventorySalesPort inventory;
    record Fixture(String token, long warehouse, long cash, long unit, List<Long> products) {}
    record Gate(CountDownLatch locked, CountDownLatch release, AtomicInteger pid) {}

    @Test void exactConfirmationAndLostResponseReplaySurviveCatalogAndCashChanges() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f);
        MvcResult first = submit(f, request); assertEquals(201, first.getResponse().getStatus());
        long id = readJson(first).path("id").asLong();
        var persisted = snapshot(f);
        jdbc.update("update products set sale_price=12 where id=?", f.products().get(0));
        closeCash(f.token(), f.cash(), BigDecimal.TEN, "checkout replay");
        MvcResult replay = submit(f, request);
        assertEquals(201, replay.getResponse().getStatus());
        assertEquals(id, readJson(replay).path("id").asLong());
        assertEquals(persisted, snapshot(f), "Replay must not duplicate payments, movements or operations");
    }

    @ParameterizedTest @ValueSource(strings={"operationId","confirmedTotal","confirmedUnitPrice"})
    void missingMandatoryConfirmationIsRejectedBeforeWrites(String field) throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f); var before = snapshot(f);
        if (field.equals("confirmedUnitPrice")) ((ObjectNode)request.withArray("items").get(0)).remove(field);
        else request.remove(field);
        assertEquals(400, submit(f, request).getResponse().getStatus()); assertEquals(before, snapshot(f));
    }

    @ParameterizedTest @ValueSource(strings={"confirmedTotal","confirmedUnitPrice"})
    void invalidConfirmedMoneyPrecisionIsRejected(String field) throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f); var before = snapshot(f);
        if (field.equals("confirmedUnitPrice")) ((ObjectNode)request.withArray("items").get(0)).put(field, new BigDecimal("10.001"));
        else request.put(field, new BigDecimal("10.001"));
        assertEquals(422, submit(f, request).getResponse().getStatus()); assertEquals(before, snapshot(f));
    }

    @Test void malformedOperationIdentifierIsAValidationErrorWithoutWrites() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f).put("operationId", "not-a-uuid"); var before = snapshot(f);
        assertEquals(400, submit(f, request).getResponse().getStatus()); assertEquals(before, snapshot(f));
    }

    @ParameterizedTest @ValueSource(strings={"price","total"})
    void stalePriceOrTotalHasStableConflictAndNoPartialWrites(String field) throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f); var before = snapshot(f);
        if (field.equals("price")) ((ObjectNode)request.withArray("items").get(0)).put("confirmedUnitPrice", 9);
        else request.put("confirmedTotal", 9);
        MvcResult result = submit(f, request);
        assertEquals(409, result.getResponse().getStatus());
        JsonNode body = readJson(result);
        assertEquals("PRICE_CONFIRMATION_REQUIRED", body.path("code").asText());
        assertEquals(0, BigDecimal.TEN.compareTo(body.path("proposedTotal").decimalValue()));
        assertEquals(field.equals("price") ? 1 : 0, body.path("changes").size());
        assertEquals(before, snapshot(f));
    }

    @Test void changedOperationContentIsRejectedButDecimalRepresentationsAreCanonical() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f);
        long id = readJson(submit(f, request)).path("id").asLong(); var before = snapshot(f);
        ObjectNode equivalent = request.deepCopy().put("confirmedTotal", new BigDecimal("10.000"));
        ((ObjectNode) equivalent.withArray("items").get(0)).put("quantity", new BigDecimal("1.000"))
                .put("confirmedUnitPrice", new BigDecimal("10.00"));
        assertEquals(id, readJson(submit(f, equivalent)).path("id").asLong());
        ((ObjectNode) request.withArray("payments").get(0)).put("amount", 11);
        MvcResult conflict = submit(f, request);
        assertEquals(409, conflict.getResponse().getStatus());
        assertEquals("OPERATION_CONTENT_MISMATCH", readJson(conflict).path("code").asText());
        assertTrue(readJson(conflict).path("message").asText().contains("OPERATION_CONTENT_MISMATCH"));
        assertEquals(before, snapshot(f));
    }

    @Test void concurrentIdenticalRequestsWaitForTheSameDurableResult() throws Exception {
        Fixture f = fixture(2); ObjectNode request = sale(f); Gate gate = pauseAfterCatalog();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = executor.submit(() -> submit(f, request.deepCopy()));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            ObjectNode reordered = request.deepCopy();
            var reversed = reordered.putArray("items");
            for (int i=request.withArray("items").size()-1; i>=0; i--) reversed.add(request.withArray("items").get(i).deepCopy());
            Future<MvcResult> second = executor.submit(() -> submit(f, reordered));
            awaitBlockedBy(gate.pid().get());
            gate.release().countDown();
            MvcResult a = first.get(15, TimeUnit.SECONDS), b = second.get(15, TimeUnit.SECONDS);
            assertEquals(201, a.getResponse().getStatus()); assertEquals(201, b.getResponse().getStatus());
            assertEquals(readJson(a).path("id"), readJson(b).path("id"));
            assertEquals(1, ((Number)snapshot(f).get("sales")).intValue());
            assertEquals(1, ((Number)snapshot(f).get("operations")).intValue());
            verify(org.springframework.test.util.AopTestUtils.<CheckoutReadPort>getUltimateTargetObject(checkout), times(1)).lockCatalog(anyList());
        } finally { gate.release().countDown(); executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @Test void operationIdentityIsScopedToTheAuthenticatedActor() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f);
        long first = readJson(submit(f, request)).path("id").asLong();
        String other = login(CAJERO_EMAIL, CAJERO_PASSWORD);
        long cash = openCash(other, BigDecimal.ZERO, "Synthetic actor isolation");
        Fixture second = new Fixture(other, f.warehouse(), cash, f.unit(), f.products());
        MvcResult result = submit(second, request);
        assertEquals(201, result.getResponse().getStatus()); assertNotEquals(first, readJson(result).path("id").asLong());
        assertEquals(2, jdbc.queryForObject("select count(distinct actor_user_id) from sale_operations where operation_id=?",
                Integer.class, UUID.fromString(request.path("operationId").asText())));
        assertEquals(jdbc.queryForObject("select opened_by_user_id from cash_register_sessions where id=?", UUID.class, cash),
                jdbc.queryForObject("select actor_user_id from sale_operations where sale_id=?", UUID.class, readJson(result).path("id").asLong()));
    }

    @Test void administrativeRemovalRetainsAnIdempotencyTombstoneAndCannotRecreateTheSale() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f);
        long id = readJson(submit(f, request)).path("id").asLong();
        jdbc.update("delete from sales where id=?", id);
        var afterRemoval = snapshot(f);
        assertEquals(1, jdbc.queryForObject("select count(*) from sale_operations where operation_id=? and sale_id is null",
                Integer.class, UUID.fromString(request.path("operationId").asText())));
        MvcResult replay = submit(f, request);
        assertEquals(409, replay.getResponse().getStatus());
        assertEquals("OPERATION_RESULT_UNAVAILABLE", readJson(replay).path("code").asText());
        assertEquals(afterRemoval, snapshot(f), "A tombstone must never be treated as a new operation");
    }

    @Test void aLowerCurrentPriceWithAnIncompatibleDiscountStillRequiresExplicitReview() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f); var before = snapshot(f);
        ((ObjectNode) request.withArray("items").get(0)).put("discountAmount", 9);
        request.put("confirmedTotal", 1);
        jdbc.update("update products set sale_price=8 where id=?", f.products().get(0));
        MvcResult result = submit(f, request);
        assertEquals(409, result.getResponse().getStatus()); assertEquals("PRICE_CONFIRMATION_REQUIRED", readJson(result).path("code").asText());
        assertTrue(readJson(result).path("proposedTotal").isNull(), "An invalid discounted proposal must never invent a valid total");
        assertEquals(before, snapshot(f));
    }

    @Test void currentQuantityPolicyIsAuthoritativeWithoutRepairingTheRequest() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f); var before = snapshot(f);
        ((ObjectNode) request.withArray("items").get(0)).put("quantity", new BigDecimal("0.25"));
        request.put("confirmedTotal", new BigDecimal("2.50"));
        ((ObjectNode) request.withArray("payments").get(0)).put("amount", new BigDecimal("2.50"));
        assertEquals(422, submit(f, request).getResponse().getStatus()); assertEquals(before, snapshot(f));
    }

    @ParameterizedTest @ValueSource(strings={"price","policy"})
    void catalogChangesWaitForShareLocksUntilCheckoutCommits(String kind) throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f); Gate gate = pauseAfterCatalog();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> sale = executor.submit(() -> submit(f, request));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<?> change = executor.submit(() -> new TransactionTemplate(txManager).executeWithoutResult(tx -> {
                jdbc.execute("set local lock_timeout='8s'");
                if (kind.equals("price")) jdbc.update("update products set sale_price=12 where id=?", f.products().get(0));
                else jdbc.update("update units set quantity_policy='DECIMAL_2' where id=?", f.unit());
            }));
            awaitBlockedBy(gate.pid().get());
            gate.release().countDown();
            MvcResult result = sale.get(15, TimeUnit.SECONDS); change.get(15, TimeUnit.SECONDS);
            assertEquals(201, result.getResponse().getStatus());
            assertEquals(0, BigDecimal.TEN.compareTo(readJson(result).path("items").get(0).path("unitPrice").decimalValue()));
            assertEquals(kind.equals("price") ? 12 : 10, jdbc.queryForObject("select sale_price from products where id=?", BigDecimal.class, f.products().get(0)).intValue());
        } finally { gate.release().countDown(); executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @Test void freshProjectionDoesNotReuseAnEarlierJpaCatalogEntity() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f); var before = snapshot(f);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            new TransactionTemplate(txManager).executeWithoutResult(tx -> {
                try {
                    assertEquals(10, products.findById(f.products().get(0)).orElseThrow().getSalePrice().intValue());
                    executor.submit(() -> jdbc.update("update products set sale_price=12 where id=?", f.products().get(0))).get(5, TimeUnit.SECONDS);
                    assertEquals(409, submit(f, request).getResponse().getStatus());
                    tx.setRollbackOnly();
                } catch (Exception ex) { throw new AssertionError(ex); }
            });
            assertEquals(before, snapshot(f));
        } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @Test void stockContentionFailsWithoutWaitingOrDeadlockAndCanRetry() throws Exception {
        Fixture f = fixture(2); ObjectNode request = sale(f); var before = snapshot(f);
        CountDownLatch locked = new CountDownLatch(1), release = new CountDownLatch(1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            Future<?> holder = executor.submit(() -> new TransactionTemplate(txManager).executeWithoutResult(tx -> {
                jdbc.queryForList("select id from stock_balances where product_id=? and warehouse_id=? for update",
                        f.products().get(1), f.warehouse());
                locked.countDown(); await(release);
            }));
            assertTrue(locked.await(10, TimeUnit.SECONDS));
            assertEquals(409, submit(f, request).getResponse().getStatus());
            assertEquals(before, snapshot(f), "A partial lock set must not produce any writes");
            release.countDown(); holder.get(10, TimeUnit.SECONDS);
            assertEquals(201, submit(f, request).getResponse().getStatus());
        } finally { release.countDown(); executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @Test void transactionRollbackRemovesCompletedIdentityAndAllowsSameOperation() throws Exception {
        Fixture f = fixture(1); ObjectNode request = sale(f); var before = snapshot(f);
        new TransactionTemplate(txManager).executeWithoutResult(tx -> {
            try {
                assertEquals(201, submit(f, request).getResponse().getStatus());
                assertNotEquals(before, snapshot(f));
                tx.setRollbackOnly();
            } catch (Exception ex) { throw new AssertionError(ex); }
        });
        assertEquals(before, snapshot(f));
        assertEquals(201, submit(f, request).getResponse().getStatus());
        assertEquals(1, ((Number)snapshot(f).get("operations")).intValue());
    }

    @Test void inventoryFailureRollsBackSalePaymentsStockAndOperation() throws Exception {
        Fixture f = fixture(2); ObjectNode request = sale(f); var before = snapshot(f);
        doThrow(new SalesBusinessRuleException("Synthetic checkout rollback")).when(inventory)
                .registerSaleOut(eq(f.products().get(1)), anyLong(), any(), anyString(), anyString(), anyString());
        assertEquals(422, submit(f, request).getResponse().getStatus()); assertEquals(before, snapshot(f));
        reset(inventory);
        assertEquals(201, submit(f, request).getResponse().getStatus());
    }

    @Test void quoteConversionPreservesHistoryAndReplaysExactlyOnce() throws Exception {
        Fixture f = fixture(1); long quote = quote(f); var historical = quoteAmounts(quote);
        jdbc.update("update products set sale_price=12 where id=?", f.products().get(0));
        ObjectNode request = conversion(f, quote); MvcResult first = convert(f, quote, request);
        assertEquals(200, first.getResponse().getStatus()); long sale = readJson(first).path("convertedSaleId").asLong();
        assertEquals(12, jdbc.queryForObject("select total_amount from sales where id=?", BigDecimal.class, sale).intValue());
        assertEquals(historical, quoteAmounts(quote));
        int history = jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote);
        assertEquals(sale, readJson(convert(f, quote, request)).path("convertedSaleId").asLong());
        assertEquals(history, jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote));
        assertEquals(1, ((Number)snapshot(f).get("operations")).intValue());
    }

    @ParameterizedTest @ValueSource(strings={"price","quantity","discount","quoteItemId"})
    void staleOrMismatchedQuoteConfirmationNeverPartiallyConverts(String kind) throws Exception {
        Fixture f = fixture(1); long quote = quote(f); ObjectNode request = conversion(f, quote); var before = snapshot(f);
        ObjectNode line = (ObjectNode) request.withArray("items").get(0);
        if (kind.equals("price")) jdbc.update("update products set sale_price=12 where id=?", f.products().get(0));
        if (kind.equals("quantity")) line.put("quantity", 2);
        if (kind.equals("discount")) line.put("discountAmount", 1);
        if (kind.equals("quoteItemId")) line.put("quoteItemId", -1);
        MvcResult result = convert(f, quote, request);
        assertEquals(kind.equals("price") ? 409 : 422, result.getResponse().getStatus());
        assertEquals(before, snapshot(f)); assertEquals("DRAFT", jdbc.queryForObject("select status from quotes where id=?", String.class, quote));
        assertNull(jdbc.queryForObject("select converted_sale_id from quotes where id=?", Long.class, quote));
        assertEquals(0, jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote));
    }

    @Test void concurrentQuoteConversionsShareOneSaleAndOneHistory() throws Exception {
        Fixture f = fixture(1); long quote = quote(f); ObjectNode request = conversion(f, quote); Gate gate = pauseAfterCatalog();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = executor.submit(() -> convert(f, quote, request.deepCopy()));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> second = executor.submit(() -> convert(f, quote, request.deepCopy()));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            MvcResult a = first.get(15, TimeUnit.SECONDS), b = second.get(15, TimeUnit.SECONDS);
            assertEquals(200, a.getResponse().getStatus()); assertEquals(200, b.getResponse().getStatus());
            assertEquals(readJson(a).path("convertedSaleId"), readJson(b).path("convertedSaleId"));
            assertEquals(1, ((Number)snapshot(f).get("sales")).intValue());
            assertEquals(1, jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote));
        } finally { gate.release().countDown(); executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @ParameterizedTest @ValueSource(strings={"update","send","cancel"})
    void administrativeQuoteMutationsCannotOverwriteConcurrentConversion(String action) throws Exception {
        Fixture f = fixture(1); long quote = quote(f); ObjectNode request = conversion(f, quote); Gate gate = pauseAfterCatalog();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = executor.submit(() -> convert(f, quote, request));
            assertTrue(gate.locked().await(10, TimeUnit.SECONDS));
            Future<MvcResult> edit = executor.submit(() -> {
                var route = action.equals("update") ? put("/api/v1/quotes/{id}", quote) : post("/api/v1/quotes/{id}/" + action, quote);
                ObjectNode body = action.equals("update") ? quoteBody(f) : objectMapper.createObjectNode().put("comment", "Synthetic concurrency");
                return mockMvc.perform(route.header(HttpHeaders.AUTHORIZATION, bearer(f.token())).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andReturn();
            });
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            assertEquals(200, first.get(15, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(409, edit.get(15, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals("CONVERTED", jdbc.queryForObject("select status from quotes where id=?", String.class, quote));
        } finally { gate.release().countDown(); executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @Test void failedQuoteConversionRollsBackItsEntireTransaction() throws Exception {
        Fixture f = fixture(2); long quote = quote(f); ObjectNode request = conversion(f, quote); var before = snapshot(f);
        doThrow(new SalesBusinessRuleException("Synthetic quote rollback")).when(inventory)
                .registerSaleOut(eq(f.products().get(1)), anyLong(), any(), anyString(), anyString(), anyString());
        assertEquals(422, convert(f, quote, request).getResponse().getStatus()); assertEquals(before, snapshot(f));
        assertEquals("DRAFT", jdbc.queryForObject("select status from quotes where id=?", String.class, quote));
        assertEquals(0, jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote));
    }

    @Test void snapshotIsReadOnlyAndUsesExistingPosPermissions() throws Exception {
        Fixture f = fixture(1); var before = snapshot(f);
        MvcResult snapshot = mockMvc.perform(get("/api/v1/pos/products/snapshot").param("productIds", f.products().get(0).toString())
                .param("warehouseId", Long.toString(f.warehouse())).header(HttpHeaders.AUTHORIZATION, bearer(f.token()))).andReturn();
        assertEquals(200, snapshot.getResponse().getStatus()); assertEquals(10, readJson(snapshot).get(0).path("salePrice").asInt());
        assertEquals(10, readJson(snapshot).get(0).path("stockAvailable").asInt());
        assertEquals("WHOLE", readJson(snapshot).get(0).path("quantityPolicy").asText());
        assertEquals(401, mockMvc.perform(get("/api/v1/pos/products/snapshot").param("productIds", f.products().get(0).toString()).param("warehouseId", Long.toString(f.warehouse()))).andReturn().getResponse().getStatus());
        String denied = login(ALMACENERO_EMAIL, ALMACENERO_PASSWORD);
        assertEquals(403, mockMvc.perform(get("/api/v1/pos/products/snapshot").param("productIds", f.products().get(0).toString()).param("warehouseId", Long.toString(f.warehouse()))
                .header(HttpHeaders.AUTHORIZATION, bearer(denied))).andReturn().getResponse().getStatus());
        assertEquals(before, snapshot(f));
    }

    private Fixture fixture(int count) throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD), suffix = "CK" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        long category = createCategory(token, suffix), unit = createUnit(token, suffix), warehouse = createWarehouse(token, suffix);
        var ids = new java.util.ArrayList<Long>();
        for (int i=0; i<count; i++) { long p = createProduct(token, category, unit, suffix+i, BigDecimal.TEN); registerInitialStock(token,p,warehouse,BigDecimal.TEN,"Synthetic checkout"); ids.add(p); }
        return new Fixture(token, warehouse, openCash(token, BigDecimal.ZERO, suffix), unit, List.copyOf(ids));
    }
    private ObjectNode sale(Fixture f) {
        ObjectNode body=objectMapper.createObjectNode().put("warehouseId",f.warehouse());
        var lines=body.putArray("items"); f.products().forEach(p -> lines.addObject().put("productId",p).put("quantity",1).put("discountAmount",0));
        body.putArray("payments").addObject().put("paymentMethod","CASH").put("amount",10*f.products().size());
        confirmSalePayload(body); return body;
    }
    private MvcResult submit(Fixture f, ObjectNode request) throws Exception {
        return mockMvc.perform(post("/api/v1/sales").header(HttpHeaders.AUTHORIZATION,bearer(f.token())).contentType(MediaType.APPLICATION_JSON).content(request.toString())).andReturn();
    }
    private ObjectNode quoteBody(Fixture f) {
        ObjectNode body=objectMapper.createObjectNode().put("customerName","Synthetic checkout").put("expiresAt",LocalDate.now().plusDays(1).toString());
        var lines=body.putArray("items"); f.products().forEach(p -> lines.addObject().put("productId",p).put("quantity",1).put("discountAmount",0)); return body;
    }
    private long quote(Fixture f) throws Exception {
        MvcResult result=mockMvc.perform(post("/api/v1/quotes").header(HttpHeaders.AUTHORIZATION,bearer(f.token())).contentType(MediaType.APPLICATION_JSON).content(quoteBody(f).toString())).andReturn();
        assertEquals(201,result.getResponse().getStatus()); return readJson(result).path("id").asLong();
    }
    private ObjectNode conversion(Fixture f,long quote) {
        ObjectNode body=objectMapper.createObjectNode().put("warehouseId",f.warehouse());
        body.putArray("payments").addObject().put("paymentMethod","CASH").put("amount",100);
        confirmQuotePayload(quote,body); return body;
    }
    private MvcResult convert(Fixture f,long quote,ObjectNode body) throws Exception {
        return mockMvc.perform(post("/api/v1/quotes/{id}/convert-to-sale",quote).header(HttpHeaders.AUTHORIZATION,bearer(f.token())).contentType(MediaType.APPLICATION_JSON).content(body.toString())).andReturn();
    }
    private Map<String,Object> quoteAmounts(long quote) {
        return Map.of("header",jdbc.queryForMap("select subtotal_amount,discount_amount,total_amount from quotes where id=?",quote),
                "lines",jdbc.queryForList("select id,quantity,unit_price,discount_amount,line_total from quote_items where quote_id=? order by id",quote));
    }
    private Map<String,Object> snapshot(Fixture f) {
        return jdbc.queryForMap("""
                select (select count(*) from sales where cash_register_session_id=?) sales,
                (select count(*) from sale_items i join sales s on i.sale_id=s.id where s.cash_register_session_id=?) items,
                (select count(*) from sale_payments p join sales s on p.sale_id=s.id where s.cash_register_session_id=?) payments,
                (select count(*) from inventory_movements where warehouse_id=?) movements,
                (select sum(quantity) from stock_balances where warehouse_id=?) stock,
                (select count(*) from sale_operations o join sales s on s.id=o.sale_id where s.cash_register_session_id=?) operations
                """,f.cash(),f.cash(),f.cash(),f.warehouse(),f.warehouse(),f.cash());
    }
    private Gate pauseAfterCatalog() {
        Gate gate=new Gate(new CountDownLatch(1),new CountDownLatch(1),new AtomicInteger());
        CheckoutReadPort target = org.springframework.test.util.AopTestUtils.getUltimateTargetObject(checkout);
        doAnswer(invocation -> { Object value=invocation.callRealMethod(); gate.pid().set(jdbc.queryForObject("select pg_backend_pid()",Integer.class));
            gate.locked().countDown(); await(gate.release()); return value; }).when(target).lockCatalog(anyList());
        return gate;
    }
    private static void await(CountDownLatch latch) {
        try { if(!latch.await(15,TimeUnit.SECONDS)) throw new AssertionError("Controlled gate timed out"); }
        catch(InterruptedException ex) { Thread.currentThread().interrupt(); throw new AssertionError(ex); }
    }
    private void awaitBlockedBy(int pid) {
        long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
        while(System.nanoTime()<end) {
            if(Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from pg_stat_activity where wait_event_type='Lock' and ?=any(pg_blocking_pids(pid)))",Boolean.class,pid))) return;
            LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(5));
        }
        fail("Expected a PostgreSQL lock waiter blocked by controlled checkout PID");
    }
}
