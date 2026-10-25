package com.erppos.backend.integration;

import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.sales.domain.port.CheckoutReadPort;
import com.erppos.backend.erp.sales.domain.port.InventorySalesPort;
import com.erppos.backend.erp.sales.domain.port.SaleOperationPort;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.concurrent.locks.LockSupport;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Real PostgreSQL contracts: HTTP responses may be discarded; operation identity survives. */
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Timeout(45)
class SaleOperationRecoveryIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    @MockitoSpyBean CheckoutReadPort checkout;
    @MockitoSpyBean InventorySalesPort inventory;
    @MockitoSpyBean SaleOperationPort operations;
    @MockitoSpyBean com.erppos.backend.erp.sales.domain.port.CatalogReadPort catalog;
    @Autowired com.erppos.backend.erp.sales.application.usecase.SaleOperationUseCase preparationUseCase;

    @AfterEach void resetPreparationCatalog() {
        reset(AopTestUtils.<com.erppos.backend.erp.sales.domain.port.CatalogReadPort>getUltimateTargetObject(catalog));
    }

    record Fixture(String token, long warehouse, long cash, List<Long> products) {}
    record Gate(CountDownLatch entered, CountDownLatch release, AtomicInteger pid) {}

    @Test void definitiveRejectionIsCertifiedOnlyAfterSuccessfulPreparationTransaction() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); var before = effects(f);
        jdbc.update("update products set active=false where id=?", f.products().get(0));
        AtomicBoolean committed = new AtomicBoolean();
        assertTrue(org.springframework.aop.support.AopUtils.isAopProxy(preparationUseCase));
        doAnswer(invocation -> {
            assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
            assertEquals(0, countOperation(command));
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { committed.set(true); }
            });
            return invocation.callRealMethod();
        }).when(AopTestUtils.<com.erppos.backend.erp.sales.domain.port.CatalogReadPort>getUltimateTargetObject(catalog))
                .findById(f.products().get(0));
        MvcResult response = prepare(f.token(), pos(command));
        assertEquals(422, response.getResponse().getStatus()); assertNoStore(response);
        JsonNode proof = readJson(response);
        assertEquals("OPERATION_PREPARATION_REJECTED", proof.path("code").asText());
        assertEquals("NOT_STORED", proof.path("outcome").asText());
        assertEquals("COMMAND_INVALID", proof.path("reasonCode").asText());
        assertEquals(command.path("operationId").asText(), proof.path("operationId").asText());
        assertEquals(actor(f.cash()).toString(), proof.path("actorUserId").asText());
        assertEquals(1, proof.path("protocolVersion").asInt()); assertEquals("POS", proof.path("origin").asText());
        assertTrue(committed.get(), "A rejection certificate must not leave the transaction before commit succeeds");
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        assertEquals(0, countOperation(command)); assertEquals(before, effects(f));
        assertEquals(404, rawDetail(f.token(), command).getResponse().getStatus());
    }

    @Test void failedPreparationCommitNeverReturnsANotStoredCertificate() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); var before = effects(f);
        jdbc.update("update products set active=false where id=?", f.products().get(0));
        doAnswer(invocation -> {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void beforeCommit(boolean readOnly) { throw new IllegalStateException("Synthetic preparation commit failure"); }
            });
            return invocation.callRealMethod();
        }).when(AopTestUtils.<com.erppos.backend.erp.sales.domain.port.CatalogReadPort>getUltimateTargetObject(catalog))
                .findById(f.products().get(0));
        MvcResult response = prepare(f.token(), pos(command));
        assertEquals(500, response.getResponse().getStatus());
        assertFalse(response.getResponse().getContentAsString().contains("NOT_STORED"));
        assertEquals(0, countOperation(command)); assertEquals(before, effects(f));
    }

    @Test void existingPreparationIsNeverCertifiedAbsentAfterProductDeactivation() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f);
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus());
        jdbc.update("update products set active=false where id=?", f.products().get(0));
        MvcResult response = prepare(f.token(), pos(command));
        assertEquals(201, response.getResponse().getStatus());
        assertEquals("PREPARED", readJson(response).path("state").asText());
        assertFalse(response.getResponse().getContentAsString().contains("NOT_STORED"));
        assertEquals(1, countOperation(command)); assertEquals(0, ((Number)effects(f).get("sales")).intValue());
    }

    @Test void authorizedOtherEmployeeOwnsThePreparationAndConcurrentQuoteConversionIsUnique() throws Exception {
        Fixture creator = fixture(1); long quote = quote(creator);
        String cashier = login(CAJERO_EMAIL, CAJERO_PASSWORD);
        Fixture converter = new Fixture(cashier, creator.warehouse(), openCash(cashier, BigDecimal.ZERO, "Synthetic cross-employee quote"), creator.products());
        ObjectNode command = conversion(converter, quote);
        assertEquals(201, prepare(cashier, quotePreparation(quote, command)).getResponse().getStatus());
        assertEquals(actor(converter.cash()), jdbc.queryForObject("select actor_user_id from sale_operations where operation_id=?", UUID.class, uuid(command)));
        assertEquals(404, rawDetail(creator.token(), command).getResponse().getStatus());
        assertEquals(404, cancel(creator.token(), command).getResponse().getStatus());
        String unauthorized = login(ALMACENERO_EMAIL, ALMACENERO_PASSWORD);
        assertEquals(403, prepare(unauthorized, quotePreparation(quote, command)).getResponse().getStatus());
        assertEquals(403, mockMvc.perform(post("/api/v1/quotes/{id}/convert-to-sale", quote)
                .header(HttpHeaders.AUTHORIZATION, bearer(unauthorized)).contentType(MediaType.APPLICATION_JSON)
                .content(command.toString())).andReturn().getResponse().getStatus());
        Gate gate = pauseAfterCatalog(); ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = pool.submit(() -> convert(converter, quote, command.deepCopy())); awaitEntered(gate);
            Future<MvcResult> second = pool.submit(() -> convert(converter, quote, command.deepCopy()));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            MvcResult a = first.get(15, TimeUnit.SECONDS), b = second.get(15, TimeUnit.SECONDS);
            assertEquals(200, a.getResponse().getStatus()); assertEquals(200, b.getResponse().getStatus());
            assertEquals(readJson(a).path("convertedSaleId"), readJson(b).path("convertedSaleId"));
            assertEquals(1, ((Number)effects(converter).get("sales")).intValue());
            assertEquals(1, jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote));
            assertEquals("COMPLETED", detail(cashier, command).path("state").asText());
            assertEquals(404, rawDetail(creator.token(), command).getResponse().getStatus());
        } finally { finish(pool, gate); }
    }

    @Test void preparationPersistsWithoutCommercialEffectsAndCanBeDiscoveredAfterResponseLoss() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); var before = effects(f);
        MvcResult prepared = prepare(f.token(), pos(command));
        assertEquals(201, prepared.getResponse().getStatus()); assertNoStore(prepared);
        assertEquals(before, effects(f), "Preparation cannot charge, create a sale or move stock");
        // Intentionally discard the response: a fresh authenticated GET is the only recovery input.
        JsonNode recovered = detail(f.token(), command);
        assertEquals("PREPARED", recovered.path("state").asText());
        assertEquals(f.cash(), recovered.path("cashRegisterSessionId").asLong());
        assertCapturedCommand(command, recovered.path("command"), false);
        assertEquals("TICKET", recovered.path("receiptIntent").path("receiptType").asText());
        MvcResult list = list(f.token(), "PREPARED", 0, 20);
        assertEquals(200, list.getResponse().getStatus()); assertNoStore(list);
        assertTrue(containsOperation(readJson(list).path("items"), command.path("operationId").asText()));
        assertEquals(before, effects(f));
    }

    @Test void preparationIsIdempotentForTheSameIdentityAndCanonicalDecimalContent() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); ObjectNode request = pos(command);
        assertEquals(201, prepare(f.token(), request).getResponse().getStatus());
        ObjectNode equivalent = request.deepCopy();
        ((ObjectNode) equivalent.path("command")).put("confirmedTotal", new BigDecimal("10.000"));
        ((ObjectNode) equivalent.path("command").path("items").get(0)).put("quantity", new BigDecimal("1.000"));
        assertTrue(prepare(f.token(), equivalent).getResponse().getStatus() < 300);
        assertEquals(1, countOperation(command));
        assertEquals(0, ((Number) effects(f).get("sales")).intValue());
    }

    @ParameterizedTest @ValueSource(strings = {"payment", "receipt", "origin", "operationId"})
    void frozenContentAndIntentCannotBeChangedDuringPreparation(String field) throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f), request = pos(command);
        assertEquals(201, prepare(f.token(), request).getResponse().getStatus());
        ObjectNode changed = request.deepCopy();
        if (field.equals("payment")) ((ObjectNode) changed.path("command").path("payments").get(0)).put("amount", 11);
        if (field.equals("receipt")) ((ObjectNode) changed.path("receiptIntent")).put("receiptType", "UNKNOWN");
        if (field.equals("origin")) changed.put("origin", "QUOTE");
        if (field.equals("operationId")) ((ObjectNode) changed.path("command")).put("operationId", UUID.randomUUID().toString());
        assertTrue(prepare(f.token(), changed).getResponse().getStatus() >= 400);
        assertEquals(1, countOperation(command));
        assertCapturedCommand(command, detail(f.token(), command).path("command"), false);
    }

    @Test void multiplePendingAndIdenticalPurchasesHaveIndependentIdentitiesAndBoundedPages() throws Exception {
        Fixture f = fixture(1); ObjectNode first = sale(f), second = sale(f), third = sale(f);
        for (ObjectNode command : List.of(first, second, third)) assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus());
        MvcResult page = list(f.token(), "PREPARED", 0, 1); JsonNode body = readJson(page);
        assertEquals(200, page.getResponse().getStatus()); assertEquals(1, body.path("items").size());
        assertEquals(1, body.path("size").asInt()); assertTrue(body.path("totalItems").asLong() >= 3);
        assertTrue(body.path("items").get(0).path("command").isNull() || body.path("items").get(0).path("command").isMissingNode());
        assertEquals(201, execute(f, first).getResponse().getStatus());
        assertEquals(201, execute(f, second).getResponse().getStatus());
        assertEquals(2, ((Number) effects(f).get("sales")).intValue(), "Identical legitimate purchases must not be deduplicated");
        assertNotEquals(detail(f.token(), first).path("saleId"), detail(f.token(), second).path("saleId"));
        assertEquals("PREPARED", detail(f.token(), third).path("state").asText());
    }

    @Test void newConsumerWithoutPreparationIsRejectedWithoutAnyWrite() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); var before = effects(f);
        MvcResult response = execute(f, command);
        assertEquals(409, response.getResponse().getStatus());
        assertEquals("OPERATION_PREPARATION_REQUIRED", readJson(response).path("code").asText());
        assertEquals(before, effects(f)); assertEquals(0, countOperation(command));
    }

    @Test void lostCheckoutResponseRecoversOneCompletedSaleAndDoesNotRequireBrowserStorageOrOpenCash() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f);
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus());
        MvcResult completed = execute(f, command); assertEquals(201, completed.getResponse().getStatus());
        long saleId = readJson(completed).path("id").asLong(); var committed = effects(f);
        closeCash(f.token(), f.cash(), BigDecimal.TEN, "Synthetic completed recovery");
        JsonNode recovered = detail(f.token(), command);
        assertEquals("COMPLETED", recovered.path("state").asText()); assertEquals(saleId, recovered.path("saleId").asLong());
        assertTrue(recovered.path("command").isNull() || recovered.path("command").isMissingNode(), "Resolved commands should be minimized");
        assertEquals(saleId, readJson(execute(f, command)).path("id").asLong());
        assertEquals(committed, effects(f), "Reading and legacy replay must not duplicate any commercial effect");
    }

    @Test void preparedOperationCannotMoveToANewCashSessionAfterOriginalSessionClosed() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f);
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus());
        closeCash(f.token(), f.cash(), BigDecimal.ZERO, "Synthetic original cash closed");
        long newCash = openCash(f.token(), BigDecimal.ZERO, "Synthetic new cash"); assertNotEquals(f.cash(), newCash);
        var before = effects(f);
        assertEquals(409, execute(f, command).getResponse().getStatus()); assertEquals(before, effects(f));
        assertEquals(f.cash(), detail(f.token(), command).path("cashRegisterSessionId").asLong());
        assertEquals("PREPARED", detail(f.token(), command).path("state").asText());
    }

    @Test void cancellationIsTerminalAndCannotBeUsedToReuseTheCommercialIdentity() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f);
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus()); var before = effects(f);
        MvcResult cancelled = cancel(f.token(), command); assertEquals(200, cancelled.getResponse().getStatus()); assertNoStore(cancelled);
        assertEquals("CANCELLED", readJson(cancelled).path("state").asText());
        assertEquals(409, execute(f, command).getResponse().getStatus());
        MvcResult repeated = prepare(f.token(), pos(command));
        assertTrue(repeated.getResponse().getStatus() == 409 || readJson(repeated).path("state").asText().equals("CANCELLED"));
        assertEquals("CANCELLED", detail(f.token(), command).path("state").asText());
        assertEquals(before, effects(f)); assertEquals(1, countOperation(command));
    }

    @Test void changedPricesRequireExplicitReviewWithoutMutatingTheFrozenRequest() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f);
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus()); var before = effects(f);
        jdbc.update("update products set sale_price=12 where id=?", f.products().get(0));
        MvcResult response = execute(f, command); assertEquals(409, response.getResponse().getStatus());
        assertEquals("PRICE_CONFIRMATION_REQUIRED", readJson(response).path("code").asText());
        assertCapturedCommand(command, detail(f.token(), command).path("command"), false); assertEquals(before, effects(f));
    }

    @Test void changedExecutionContentIsRejectedBeforeAnyEffect() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f);
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus()); var before = effects(f);
        ObjectNode changed = command.deepCopy(); ((ObjectNode)changed.path("payments").get(0)).put("amount", 11);
        assertEquals(409, execute(f, changed).getResponse().getStatus());
        assertCapturedCommand(command, detail(f.token(), command).path("command"), false); assertEquals(before, effects(f));
    }

    @Test void validElectronicIntentIsFrozenAndRetainedAfterCommercialCompletionWithoutCreatingADocument() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f), preparation = pos(command);
        Long series = jdbc.query("select id from billing_series where document_type='RECEIPT' and active=true and environment='LOCAL' order by id limit 1",
                (rs, row) -> rs.getLong(1)).stream().findFirst().orElse(null);
        if (series == null) series = jdbc.queryForObject("""
                insert into billing_series(document_type,series,current_number,environment,created_by,updated_by)
                values('RECEIPT',?,1,'LOCAL','synthetic','synthetic') returning id
                """, Long.class, "B" + UUID.randomUUID().toString().replace("-", "").substring(0, 7));
        ObjectNode intent = preparation.putObject("receiptIntent").put("receiptType", "RECEIPT");
        intent.putObject("payload").put("documentType", "RECEIPT").put("billingSeriesId", series)
                .put("customerName", "Synthetic receipt owner").put("customerDocument", "12345678");
        assertEquals(201, prepare(f.token(), preparation).getResponse().getStatus());
        ObjectNode changed = preparation.deepCopy();
        ((ObjectNode) changed.path("receiptIntent").path("payload")).put("customerName", "Different synthetic identity");
        assertEquals(409, prepare(f.token(), changed).getResponse().getStatus(), "A valid but different intent must conflict");
        assertReceiptIntent(intent, detail(f.token(), command).path("receiptIntent"));
        assertEquals(201, execute(f, command).getResponse().getStatus());
        JsonNode recovered = detail(f.token(), command);
        assertEquals("COMPLETED", recovered.path("state").asText());
        assertEquals("PENDING", recovered.path("receiptState").asText());
        assertReceiptIntent(intent, recovered.path("receiptIntent"));
        assertTrue(recovered.path("command").isNull() || recovered.path("command").isMissingNode());
        assertEquals(0, jdbc.queryForObject("select count(*) from electronic_documents where sale_id=?", Integer.class, recovered.path("saleId").asLong()),
                "Recovering intent never automatically issues an electronic document");
        JsonNode listing = readJson(list(f.token(), "COMPLETED", 0, 100)).path("items");
        JsonNode summary = null;
        for (JsonNode row : listing) if (row.path("operationId").asText().equals(command.path("operationId").asText())) summary = row;
        assertNotNull(summary); assertTrue(summary.path("receiptIntent").path("payload").isNull(), "List summaries must not reveal customer identifiers");
    }

    @ParameterizedTest @ValueSource(strings={"items", "payments"})
    void nullCommercialLinesAreRejectedWithoutPreparationOrCommercialEffects(String collection) throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); var before = effects(f);
        command.putArray(collection).addNull();
        MvcResult response = prepare(f.token(), pos(command));
        assertTrue(response.getResponse().getStatus() == 400 || response.getResponse().getStatus() == 422,
                "Malformed line entries must be rejected as input, never as an internal error");
        assertEquals(0, countOperation(command)); assertEquals(before, effects(f));
    }

    @Test void electronicIdentityLongerThanThePersistenceContractIsRejectedBeforePreparation() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f), preparation = pos(command); var before = effects(f);
        ObjectNode intent = preparation.putObject("receiptIntent").put("receiptType", "RECEIPT");
        intent.putObject("payload").put("documentType", "RECEIPT").put("billingSeriesId", receiptSeries())
                .put("customerName", "X".repeat(181)).put("customerDocument", "12345678");
        assertEquals(422, prepare(f.token(), preparation).getResponse().getStatus());
        assertEquals(0, countOperation(command)); assertEquals(before, effects(f));
    }

    @Test void cancellationRedactsExecutableSnapshotsAndCustomerIdentityButRetainsTerminalFingerprint() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f), preparation = pos(command);
        preparation.putObject("receiptIntent").put("receiptType", "RECEIPT").putObject("payload")
                .put("documentType", "RECEIPT").put("billingSeriesId", receiptSeries())
                .put("customerName", "Synthetic private identity").put("customerDocument", "12345678");
        assertEquals(201, prepare(f.token(), preparation).getResponse().getStatus());
        String fingerprint = jdbc.queryForObject("select intent_hash from sale_operations where operation_id=?", String.class, uuid(command));
        assertEquals(200, cancel(f.token(), command).getResponse().getStatus());
        var stored = jdbc.queryForMap("select state, command_snapshot, quote_snapshot, receipt_intent, intent_hash from sale_operations where operation_id=?", uuid(command));
        assertEquals("CANCELLED", stored.get("state")); assertNull(stored.get("command_snapshot")); assertNull(stored.get("quote_snapshot"));
        assertEquals(fingerprint, stored.get("intent_hash"));
        JsonNode intent = objectMapper.readTree(stored.get("receipt_intent").toString());
        assertEquals("RECEIPT", intent.path("receiptType").asText()); assertTrue(intent.path("payload").isNull());
        assertEquals(409, execute(f, command).getResponse().getStatus());
    }

    @Test void preparationAndResultsAreOwnerOnlyEvenForAdministratorsAndSurviveFreshAuthentication() throws Exception {
        Fixture f = fixture(1); String cashier = login(CAJERO_EMAIL, CAJERO_PASSWORD);
        openCash(cashier, BigDecimal.ZERO, "Synthetic owner-only recovery"); ObjectNode command = sale(f);
        assertEquals(201, prepare(cashier, pos(command)).getResponse().getStatus());
        assertEquals(404, rawDetail(f.token(), command).getResponse().getStatus());
        assertEquals(404, cancel(f.token(), command).getResponse().getStatus());
        assertFalse(containsOperation(readJson(list(f.token(), null, 0, 100)).path("items"), command.path("operationId").asText()));
        String freshLogin = login(CAJERO_EMAIL, CAJERO_PASSWORD);
        assertEquals("PREPARED", detail(freshLogin, command).path("state").asText());
        ObjectNode nonexistent = command.deepCopy().put("operationId", UUID.randomUUID().toString());
        assertEquals(404, rawDetail(freshLogin, nonexistent).getResponse().getStatus());
    }

    @Test void unauthenticatedAndWarehouseOnlyRolesCannotUseRecoveryRoutes() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); String warehouse = login(ALMACENERO_EMAIL, ALMACENERO_PASSWORD);
        assertEquals(401, mockMvc.perform(get("/api/v1/sales/operations")).andReturn().getResponse().getStatus());
        assertEquals(403, list(warehouse, null, 0, 20).getResponse().getStatus());
        assertEquals(403, prepare(warehouse, pos(command)).getResponse().getStatus());
        assertEquals(403, rawDetail(warehouse, command).getResponse().getStatus());
        assertEquals(403, cancel(warehouse, command).getResponse().getStatus());
        assertEquals(0, countOperation(command));
    }

    @Test void malformedIdentifiersAndPaginationCannotEscapeOwnerOrResourceValidation() throws Exception {
        Fixture f = fixture(1);
        assertEquals(400, mockMvc.perform(get("/api/v1/sales/operations/not-a-uuid")
                .header(HttpHeaders.AUTHORIZATION, bearer(f.token()))).andReturn().getResponse().getStatus());
        assertEquals(400, list(f.token(), null, -1, 20).getResponse().getStatus());
        assertEquals(400, list(f.token(), null, 0, 1001).getResponse().getStatus());
    }

    @Test void inventoryFailureRollsBackAllEffectsButKeepsTheCommittedPreparation() throws Exception {
        Fixture f = fixture(2); ObjectNode command = sale(f);
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus()); var before = effects(f);
        doThrow(new SalesBusinessRuleException("Synthetic durable checkout rollback")).when(inventory)
                .registerSaleOut(eq(f.products().get(1)), anyLong(), any(), anyString(), anyString(), anyString());
        assertEquals(422, execute(f, command).getResponse().getStatus()); assertEquals(before, effects(f));
        assertEquals("PREPARED", detail(f.token(), command).path("state").asText());
        reset(inventory);
        assertEquals(201, execute(f, command).getResponse().getStatus()); assertEquals(1, countOperation(command));
    }

    @Test void purgedCompletedResultIsATerminalTombstoneRatherThanANewPreparation() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f);
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus());
        long saleId = readJson(execute(f, command)).path("id").asLong(); jdbc.update("delete from sales where id=?", saleId);
        var afterPurge = effects(f);
        assertEquals("RESULT_UNAVAILABLE", detail(f.token(), command).path("state").asText());
        assertEquals(409, execute(f, command).getResponse().getStatus());
        assertEquals(afterPurge, effects(f)); assertEquals(1, countOperation(command));
    }

    @Test void historicalCompletedTombstoneRemainsTerminalAndHasNoInventedCommand() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); UUID actor = actor(f.cash());
        jdbc.update("insert into sale_operations(actor_user_id,operation_id,request_hash,sale_id) values (?,?,?,null)",
                actor, uuid(command), "a".repeat(64));
        JsonNode result = detail(f.token(), command);
        assertEquals("RESULT_UNAVAILABLE", result.path("state").asText());
        assertTrue(result.path("command").isNull() || result.path("command").isMissingNode());
        assertEquals(409, execute(f, command).getResponse().getStatus()); assertEquals(1, countOperation(command));
    }

    @Test void concurrentDuplicateExecutionsShareOneSaleAndOnePaymentSet() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); prepareSuccessfully(f, command);
        Gate gate = pauseAfterCatalog(); ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = pool.submit(() -> execute(f, command.deepCopy())); awaitEntered(gate);
            Future<MvcResult> second = pool.submit(() -> execute(f, command.deepCopy()));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            MvcResult a = first.get(15, TimeUnit.SECONDS), b = second.get(15, TimeUnit.SECONDS);
            assertEquals(201, a.getResponse().getStatus()); assertEquals(201, b.getResponse().getStatus());
            assertEquals(readJson(a).path("id"), readJson(b).path("id"));
            assertEquals(1, ((Number)effects(f).get("sales")).intValue());
            assertEquals(1, ((Number)effects(f).get("payments")).intValue()); assertEquals(1, countOperation(command));
        } finally { finish(pool, gate); }
    }

    @Test void checkoutWinningTheOperationLockMakesConcurrentCancellationFailWithoutUndoingTheSale() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); prepareSuccessfully(f, command);
        Gate gate = pauseAfterCatalog(); ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> checkoutResult = pool.submit(() -> execute(f, command)); awaitEntered(gate);
            Future<MvcResult> cancellation = pool.submit(() -> cancel(f.token(), command));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            assertEquals(201, checkoutResult.get(15, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(409, cancellation.get(15, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals("COMPLETED", detail(f.token(), command).path("state").asText());
            assertEquals(1, ((Number)effects(f).get("sales")).intValue());
        } finally { finish(pool, gate); }
    }

    @Test void cancellationWinningTheOperationLockPreventsConcurrentCheckout() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); prepareSuccessfully(f, command); var before = effects(f);
        Gate gate = new Gate(new CountDownLatch(1), new CountDownLatch(1), new AtomicInteger());
        SaleOperationPort target = AopTestUtils.getUltimateTargetObject(operations);
        doAnswer(invocation -> {
            invocation.callRealMethod();
            if (Thread.currentThread().getName().equals("controlled-recovery-cancel")) {
                gate.pid().set(jdbc.queryForObject("select pg_backend_pid()", Integer.class));
                gate.entered().countDown(); await(gate.release());
            }
            return null;
        }).when(target).lock(eq(actor(f.cash())), eq(uuid(command)));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> cancellation = pool.submit(() -> {
                String old = Thread.currentThread().getName(); Thread.currentThread().setName("controlled-recovery-cancel");
                try { return cancel(f.token(), command); } finally { Thread.currentThread().setName(old); }
            });
            awaitEntered(gate); Future<MvcResult> execution = pool.submit(() -> execute(f, command));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            assertEquals(200, cancellation.get(15, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(409, execution.get(15, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals("CANCELLED", detail(f.token(), command).path("state").asText()); assertEquals(before, effects(f));
        } finally { finish(pool, gate); }
    }

    @Test void operationLockTimeoutReturnsSafeConflictAndPreservesPreparationWithoutEffects() throws Exception {
        Fixture f = fixture(1); ObjectNode command = sale(f); prepareSuccessfully(f, command); var before = effects(f);
        Gate gate = new Gate(new CountDownLatch(1), new CountDownLatch(1), new AtomicInteger());
        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            Future<?> holder = pool.submit(() -> new TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
                operations.lock(actor(f.cash()), uuid(command));
                gate.entered().countDown(); await(gate.release());
            }));
            awaitEntered(gate); long start = System.nanoTime();
            assertEquals(409, execute(f, command).getResponse().getStatus());
            assertTrue(System.nanoTime() - start < TimeUnit.SECONDS.toNanos(10), "Contention must have a bounded wait");
            gate.release().countDown(); holder.get(10, TimeUnit.SECONDS);
            assertEquals("PREPARED", detail(f.token(), command).path("state").asText()); assertEquals(before, effects(f));
        } finally { finish(pool, gate); }
    }

    @Test void quotePreparationPreservesOriginalRouteAndDoesNotInventAnElectronicIntent() throws Exception {
        Fixture f = fixture(1); long quote = quote(f); ObjectNode command = conversion(f, quote); var before = effects(f);
        assertEquals(201, prepare(f.token(), quotePreparation(quote, command)).getResponse().getStatus());
        JsonNode recovered = detail(f.token(), command);
        assertEquals("QUOTE", recovered.path("origin").asText()); assertEquals(quote, recovered.path("quoteId").asLong());
        assertCapturedCommand(command, recovered.path("quoteCommand"), true); assertTrue(recovered.path("receiptIntent").isNull());
        assertEquals(before, effects(f));
        assertEquals(200, convert(f, quote, command).getResponse().getStatus());
        var committed = effects(f);
        assertEquals(200, convert(f, quote, command).getResponse().getStatus());
        assertEquals(committed, effects(f)); assertEquals("COMPLETED", detail(f.token(), command).path("state").asText());
        assertEquals(1, jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote));
    }

    @Test void quoteWithoutPreparationCannotConvertAndDoesNotLeaveAnyCommercialHistory() throws Exception {
        Fixture f = fixture(1); long quote = quote(f); ObjectNode command = conversion(f, quote); var before = effects(f);
        MvcResult response = convert(f, quote, command);
        assertEquals(409, response.getResponse().getStatus());
        assertEquals("OPERATION_PREPARATION_REQUIRED", readJson(response).path("code").asText());
        assertEquals(before, effects(f));
        assertEquals("DRAFT", jdbc.queryForObject("select status from quotes where id=?", String.class, quote));
        assertEquals(0, jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote));
    }

    @Test void preparedQuoteCannotBeExecutedThroughTheIndependentPosRoute() throws Exception {
        Fixture f = fixture(1); long quote = quote(f); ObjectNode command = conversion(f, quote);
        assertEquals(201, prepare(f.token(), quotePreparation(quote, command)).getResponse().getStatus());
        JsonNode canonical = detail(f.token(), command).path("command"); var before = effects(f);
        MvcResult response = execute(f, (ObjectNode) canonical);
        assertEquals(409, response.getResponse().getStatus()); assertEquals(before, effects(f));
        assertEquals("PREPARED", detail(f.token(), command).path("state").asText());
        assertEquals("DRAFT", jdbc.queryForObject("select status from quotes where id=?", String.class, quote));
    }

    @Test void concurrentPreparedQuoteConversionsHaveOneSaleAndOneConversionHistory() throws Exception {
        Fixture f = fixture(1); long quote = quote(f); ObjectNode command = conversion(f, quote);
        assertEquals(201, prepare(f.token(), quotePreparation(quote, command)).getResponse().getStatus());
        Gate gate = pauseAfterCatalog(); ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> first = pool.submit(() -> convert(f, quote, command.deepCopy())); awaitEntered(gate);
            Future<MvcResult> second = pool.submit(() -> convert(f, quote, command.deepCopy()));
            awaitBlockedBy(gate.pid().get()); gate.release().countDown();
            MvcResult a = first.get(15, TimeUnit.SECONDS), b = second.get(15, TimeUnit.SECONDS);
            assertEquals(200, a.getResponse().getStatus()); assertEquals(200, b.getResponse().getStatus());
            assertEquals(readJson(a).path("convertedSaleId"), readJson(b).path("convertedSaleId"));
            assertEquals(1, ((Number)effects(f).get("sales")).intValue());
            assertEquals(1, jdbc.queryForObject("select count(*) from quote_status_history where quote_id=?", Integer.class, quote));
        } finally { finish(pool, gate); }
    }

    private Fixture fixture(int products) throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD), suffix = "RC" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        long category = createCategory(token, suffix), unit = createUnit(token, suffix), warehouse = createWarehouse(token, suffix);
        java.util.ArrayList<Long> ids = new java.util.ArrayList<>();
        for (int i=0; i<products; i++) { long id = createProduct(token, category, unit, suffix+i, BigDecimal.TEN);
            registerInitialStock(token, id, warehouse, BigDecimal.TEN, "Synthetic recovery stock"); ids.add(id); }
        return new Fixture(token, warehouse, openCash(token, BigDecimal.ZERO, suffix), List.copyOf(ids));
    }
    private ObjectNode sale(Fixture f) {
        ObjectNode command = objectMapper.createObjectNode().put("warehouseId", f.warehouse());
        var items = command.putArray("items"); f.products().forEach(p -> items.addObject().put("productId", p).put("quantity", 1).put("discountAmount", 0));
        command.putArray("payments").addObject().put("paymentMethod", "CASH").put("amount", 10*f.products().size());
        confirmSalePayload(command); return command;
    }
    private ObjectNode pos(ObjectNode command) {
        ObjectNode request = objectMapper.createObjectNode().put("protocolVersion", 1).put("origin", "POS").put("operationId", command.path("operationId").asText());
        request.set("command", command.deepCopy()); request.putObject("receiptIntent").put("receiptType", "TICKET").putNull("payload"); return request;
    }
    private MvcResult prepare(String token, ObjectNode request) throws Exception {
        return mockMvc.perform(post("/api/v1/sales/operations").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(request.toString())).andReturn();
    }
    private void prepareSuccessfully(Fixture f, ObjectNode command) throws Exception {
        assertEquals(201, prepare(f.token(), pos(command)).getResponse().getStatus());
    }
    private MvcResult execute(Fixture f, ObjectNode command) throws Exception {
        return mockMvc.perform(post("/api/v1/sales").header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                .contentType(MediaType.APPLICATION_JSON).content(command.toString())).andReturn();
    }
    private MvcResult rawDetail(String token, ObjectNode command) throws Exception {
        return mockMvc.perform(get("/api/v1/sales/operations/{id}", command.path("operationId").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(token))).andReturn();
    }
    private JsonNode detail(String token, ObjectNode command) throws Exception {
        MvcResult response = rawDetail(token, command); assertEquals(200, response.getResponse().getStatus()); assertNoStore(response); return readJson(response);
    }
    private MvcResult list(String token, String state, int page, int size) throws Exception {
        var request = get("/api/v1/sales/operations").param("page", Integer.toString(page)).param("size", Integer.toString(size))
                .header(HttpHeaders.AUTHORIZATION, bearer(token));
        if (state != null) request.param("state", state);
        return mockMvc.perform(request).andReturn();
    }
    private MvcResult cancel(String token, ObjectNode command) throws Exception {
        return mockMvc.perform(post("/api/v1/sales/operations/{id}/cancel", command.path("operationId").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(token))).andReturn();
    }
    private UUID uuid(ObjectNode command) { return UUID.fromString(command.path("operationId").asText()); }
    private long receiptSeries() {
        return jdbc.query("select id from billing_series where document_type='RECEIPT' and active=true and environment='LOCAL' order by id limit 1",
                (rs, row) -> rs.getLong(1)).stream().findFirst().orElseGet(() -> jdbc.queryForObject("""
                insert into billing_series(document_type,series,current_number,environment,created_by,updated_by)
                values('RECEIPT',?,1,'LOCAL','synthetic','synthetic') returning id
                """, Long.class, "B" + UUID.randomUUID().toString().replace("-", "").substring(0, 7)));
    }
    private UUID actor(long cash) { return jdbc.queryForObject("select opened_by_user_id from cash_register_sessions where id=?", UUID.class, cash); }
    private int countOperation(ObjectNode command) { return jdbc.queryForObject("select count(*) from sale_operations where operation_id=?", Integer.class, uuid(command)); }
    private boolean containsOperation(JsonNode array, String id) { for (JsonNode item : array) if (id.equals(item.path("operationId").asText())) return true; return false; }
    private void assertNoStore(MvcResult response) { assertEquals("no-store", response.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)); }
    private void assertCapturedCommand(JsonNode expected, JsonNode actual, boolean quote) {
        assertTrue(actual.isObject(), "The original executable command must be available only for a preparation");
        assertEquals(expected.path("operationId"), actual.path("operationId"));
        assertTrue(actual.path("warehouseId").isIntegralNumber());
        assertEquals(expected.path("warehouseId").asLong(), actual.path("warehouseId").asLong());
        assertEquals(0, expected.path("confirmedTotal").decimalValue().compareTo(actual.path("confirmedTotal").decimalValue()));
        assertEquals(expected.path("items").size(), actual.path("items").size());
        for (int i=0; i<expected.path("items").size(); i++) {
            JsonNode a = expected.path("items").get(i), b = actual.path("items").get(i);
            String idField = quote ? "quoteItemId" : "productId";
            assertTrue(b.path(idField).isIntegralNumber()); assertEquals(a.path(idField).asLong(), b.path(idField).asLong());
            for (String field : List.of("quantity", "discountAmount", "confirmedUnitPrice"))
                assertEquals(0, a.path(field).decimalValue().compareTo(b.path(field).decimalValue()), field);
        }
        assertEquals(expected.path("payments").size(), actual.path("payments").size());
        for (int i=0; i<expected.path("payments").size(); i++) {
            JsonNode a = expected.path("payments").get(i), b = actual.path("payments").get(i);
            assertEquals(a.path("paymentMethod"), b.path("paymentMethod"));
            assertEquals(0, a.path("amount").decimalValue().compareTo(b.path("amount").decimalValue()));
            assertEquals(a.path("reference").asText(""), b.path("reference").asText(""));
        }
        if (quote) assertEquals(expected.path("comment").asText(""), actual.path("comment").asText(""));
    }
    private void assertReceiptIntent(JsonNode expected, JsonNode actual) {
        assertEquals(expected.path("receiptType").asText(), actual.path("receiptType").asText());
        JsonNode a = expected.path("payload"), b = actual.path("payload");
        assertEquals(a.path("documentType").asText(), b.path("documentType").asText());
        assertTrue(b.path("billingSeriesId").isIntegralNumber());
        assertEquals(a.path("billingSeriesId").asLong(), b.path("billingSeriesId").asLong());
        assertEquals(a.path("customerName").asText(), b.path("customerName").asText());
        assertEquals(a.path("customerDocument").asText(), b.path("customerDocument").asText());
    }
    private Map<String, Object> effects(Fixture f) {
        return jdbc.queryForMap("""
                select (select count(*) from sales where cash_register_session_id=?) sales,
                (select count(*) from sale_items i join sales s on s.id=i.sale_id where s.cash_register_session_id=?) items,
                (select count(*) from sale_payments p join sales s on s.id=p.sale_id where s.cash_register_session_id=?) payments,
                (select count(*) from inventory_movements where warehouse_id=?) movements,
                (select sum(quantity) from stock_balances where warehouse_id=?) stock
                """, f.cash(), f.cash(), f.cash(), f.warehouse(), f.warehouse());
    }
    private ObjectNode quoteBody(Fixture f) {
        ObjectNode body = objectMapper.createObjectNode().put("customerName", "Synthetic recovery").put("expiresAt", LocalDate.now().plusDays(1).toString());
        var lines = body.putArray("items"); f.products().forEach(p -> lines.addObject().put("productId", p).put("quantity", 1).put("discountAmount", 0)); return body;
    }
    private long quote(Fixture f) throws Exception {
        MvcResult response = mockMvc.perform(post("/api/v1/quotes").header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                .contentType(MediaType.APPLICATION_JSON).content(quoteBody(f).toString())).andReturn();
        assertEquals(201, response.getResponse().getStatus()); return readJson(response).path("id").asLong();
    }
    private ObjectNode conversion(Fixture f, long quote) {
        ObjectNode command = objectMapper.createObjectNode().put("warehouseId", f.warehouse());
        command.putArray("payments").addObject().put("paymentMethod", "CASH").put("amount", 10*f.products().size());
        confirmQuotePayload(quote, command); return command;
    }
    private ObjectNode quotePreparation(long quote, ObjectNode command) {
        ObjectNode request = objectMapper.createObjectNode().put("protocolVersion", 1).put("origin", "QUOTE")
                .put("operationId", command.path("operationId").asText()).put("quoteId", quote);
        request.set("quoteCommand", command.deepCopy()); request.putNull("receiptIntent"); return request;
    }
    private MvcResult convert(Fixture f, long quote, ObjectNode command) throws Exception {
        return mockMvc.perform(post("/api/v1/quotes/{id}/convert-to-sale", quote).header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                .contentType(MediaType.APPLICATION_JSON).content(command.toString())).andReturn();
    }
    private Gate pauseAfterCatalog() {
        Gate gate = new Gate(new CountDownLatch(1), new CountDownLatch(1), new AtomicInteger());
        CheckoutReadPort target = AopTestUtils.getUltimateTargetObject(checkout);
        doAnswer(invocation -> { Object result = invocation.callRealMethod();
            gate.pid().set(jdbc.queryForObject("select pg_backend_pid()", Integer.class)); gate.entered().countDown(); await(gate.release()); return result;
        }).when(target).lockCatalog(anyList()); return gate;
    }
    private void awaitEntered(Gate gate) throws InterruptedException { assertTrue(gate.entered().await(10, TimeUnit.SECONDS), "Controlled transaction never reached gate"); }
    private static void await(CountDownLatch latch) {
        try { if (!latch.await(15, TimeUnit.SECONDS)) throw new AssertionError("Controlled transaction gate timed out"); }
        catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new AssertionError(ex); }
    }
    private void awaitBlockedBy(int pid) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            if (Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from pg_stat_activity where wait_event_type='Lock' and ?=any(pg_blocking_pids(pid)))", Boolean.class, pid))) return;
            LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(5));
        }
        fail("Expected a real PostgreSQL lock waiter for controlled PID " + pid);
    }
    private void finish(ExecutorService pool, Gate gate) throws InterruptedException {
        gate.release().countDown(); pool.shutdownNow(); assertTrue(pool.awaitTermination(5, TimeUnit.SECONDS));
    }
}
