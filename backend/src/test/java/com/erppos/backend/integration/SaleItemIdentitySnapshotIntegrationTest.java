package com.erppos.backend.integration;

import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.sales.domain.port.CheckoutReadPort;
import com.erppos.backend.erp.sales.domain.port.InventorySalesPort;
import com.erppos.backend.erp.sales.infrastructure.persistence.SaleItemEntity;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** New NOTE-1A evidence only. The inherited datasource/Flyway URLs belong to PostgreSQL 16 Testcontainers. */
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Timeout(60)
class SaleItemIdentitySnapshotIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @PersistenceContext EntityManager entityManager;
    @MockitoSpyBean InventorySalesPort inventory;
    @MockitoSpyBean CheckoutReadPort checkout;

    private record Fixture(String token, long warehouse, long cash, List<Long> products) {}

    @Test
    void saleCapturesOriginalIdentityAndReplayDoesNotRecaptureOrDuplicateEffects() throws Exception {
        Fixture fixture = fixture(1, false);
        long product = fixture.products().get(0);
        Map<String, Object> original = identity(product);
        ObjectNode command = saleCommand(fixture);
        long sale = createSale(fixture, command);
        var storedItems = items(sale);
        var effects = commercialState(fixture);
        String hash = operationHash(command);

        rename(product, "Nombre posterior", "NOTE-CHANGED-" + product);
        JsonNode detail = detail(fixture.token(), sale);
        assertEquals(original.get("name"), detail.path("items").get(0).path("productNameSnapshot").asText());
        assertEquals(original.get("sku"), detail.path("items").get(0).path("skuSnapshot").asText());
        assertEquals("Nombre posterior", detail.path("items").get(0).path("productName").asText());
        assertEquals("NOTE-CHANGED-" + product, detail.path("items").get(0).path("sku").asText());

        MvcResult replay = execute(fixture.token(), command);
        assertEquals(201, replay.getResponse().getStatus());
        assertEquals(sale, readJson(replay).path("id").asLong());
        assertEquals(original.get("name"), readJson(replay).path("items").get(0).path("productNameSnapshot").asText());
        assertEquals(storedItems, items(sale));
        assertEquals(effects, commercialState(fixture));
        assertEquals(hash, operationHash(command));
        verify(checkout, times(1)).lockCatalog(fixture.products());
    }

    @Test
    void quoteConversionCapturesIdentityAtCheckoutRatherThanAtQuoteCreation() throws Exception {
        Fixture fixture = fixture(1, false);
        long product = fixture.products().get(0);
        long quote = createQuote(fixture.token(), product, BigDecimal.ONE, LocalDate.now().plusDays(1), "NOTE-1A");
        rename(product, "Identidad al convertir", "NOTE-CONVERT-" + product);

        MvcResult result = convertQuoteToSale(fixture.token(), quote, fixture.warehouse(), new BigDecimal("100"), "NOTE-1A");
        assertEquals(200, result.getResponse().getStatus());
        long sale = readJson(result).path("convertedSaleId").asLong();
        assertTrue(sale > 0);
        JsonNode line = detail(fixture.token(), sale).path("items").get(0);
        assertEquals("Identidad al convertir", line.path("productNameSnapshot").asText());
        assertEquals("NOTE-CONVERT-" + product, line.path("skuSnapshot").asText());
        assertEquals("CONVERTED", jdbc.queryForObject("select status from quotes where id=?", String.class, quote));
        assertEquals("QUOTE", jdbc.queryForObject("select origin from sale_operations where sale_id=?", String.class, sale));
        assertEquals(1, jdbc.queryForObject("select count(*) from sales where cash_register_session_id=?", Integer.class, fixture.cash()));
        verify(checkout, times(1)).lockCatalog(fixture.products());
    }

    @Test
    void voidAndSubsequentReplayPreserveIdentityAndEveryStoredItemAmount() throws Exception {
        Fixture fixture = fixture(1, false);
        ObjectNode command = saleCommand(fixture);
        long sale = createSale(fixture, command);
        var before = items(sale);
        var amounts = headerAmounts(sale);
        rename(fixture.products().get(0), "Identidad posterior a la venta", "NOTE-VOID-" + sale);

        assertEquals(200, voidSale(fixture.token(), sale).getResponse().getStatus());
        assertEquals(before, items(sale));
        assertEquals(amounts, headerAmounts(sale));
        assertEquals("VOIDED", detail(fixture.token(), sale).path("status").asText());
        var afterVoid = commercialState(fixture);
        MvcResult replay = execute(fixture.token(), command);
        assertEquals(201, replay.getResponse().getStatus());
        assertEquals("VOIDED", readJson(replay).path("status").asText());
        assertEquals(before, items(sale));
        assertEquals(afterVoid, commercialState(fixture));
    }

    @Test
    void legacyReadAndVoidLeaveNullIdentityAndFractionalHistoryUntouched() throws Exception {
        Fixture fixture = fixture(1, false);
        long sale = legacySale(fixture, new BigDecimal("0.125"));
        var before = items(sale);
        var amounts = headerAmounts(sale);
        var effectsBeforeRead = commercialState(fixture);
        rename(fixture.products().get(0), "Catalogo actual historico", "NOTE-LEGACY-" + sale);

        JsonNode line = detail(fixture.token(), sale).path("items").get(0);
        assertTrue(line.path("productNameSnapshot").isNull());
        assertTrue(line.path("skuSnapshot").isNull());
        assertEquals("Catalogo actual historico", line.path("productName").asText());
        assertEquals("0.125", line.path("quantityText").asText());
        assertEquals(before, items(sale));
        assertEquals(effectsBeforeRead, commercialState(fixture));

        assertEquals(200, voidSale(fixture.token(), sale).getResponse().getStatus());
        assertEquals(before, items(sale));
        assertEquals(amounts, headerAmounts(sale));
        assertTrue(detail(fixture.token(), sale).path("items").get(0).path("productNameSnapshot").isNull());
    }

    @Test
    void failureAfterPersistingItemsRollsBackSnapshotsAlongWithCommercialEffects() throws Exception {
        Fixture fixture = fixture(2, false);
        ObjectNode command = saleCommand(fixture);
        prepare(fixture, command);
        var before = commercialState(fixture);
        String hash = operationHash(command);
        AtomicInteger insertedSnapshots = new AtomicInteger();
        doAnswer(invocation -> {
            insertedSnapshots.set(jdbc.queryForObject("""
                    select count(*) from sale_items i join sales s on s.id=i.sale_id
                    where s.cash_register_session_id=? and i.product_name_snapshot is not null and i.sku_snapshot is not null
                    """, Integer.class, fixture.cash()));
            throw new SalesBusinessRuleException("Synthetic NOTE-1A rollback");
        }).when(inventory).registerSaleOut(eq(fixture.products().get(1)), anyLong(), any(), anyString(), anyString(), anyString());

        assertEquals(422, execute(fixture.token(), command).getResponse().getStatus());
        assertEquals(2, insertedSnapshots.get(), "The failure must happen after both captured items have been inserted");
        assertEquals(before, commercialState(fixture));
        assertEquals(hash, operationHash(command));
        var operation = jdbc.queryForMap("select state,sale_id from sale_operations where operation_id=?",
                UUID.fromString(command.path("operationId").asText()));
        assertEquals("PREPARED", operation.get("state"));
        assertNull(operation.get("sale_id"));
    }

    @Test
    void catalogEditorWaitsForTheExistingCheckoutLockAndCannotChangeCapturedIdentity() throws Exception {
        Fixture fixture = fixture(1, false);
        long product = fixture.products().get(0);
        var original = identity(product);
        ObjectNode command = saleCommand(fixture);
        prepare(fixture, command);
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger salePid = new AtomicInteger();
        AtomicInteger editorPid = new AtomicInteger();
        CheckoutReadPort target = AopTestUtils.getUltimateTargetObject(checkout);
        doAnswer(invocation -> {
            Object projection = invocation.callRealMethod();
            salePid.set(jdbc.queryForObject("select pg_backend_pid()", Integer.class));
            locked.countDown();
            assertTrue(release.await(15, TimeUnit.SECONDS), "Release the checkout only after observing the blocked editor");
            return projection;
        }).when(target).lockCatalog(fixture.products());
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> saleRequest = executor.submit(() -> execute(fixture.token(), command));
            assertTrue(locked.await(10, TimeUnit.SECONDS));
            Future<?> editor = executor.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                jdbc.execute("set local lock_timeout='12s'");
                editorPid.set(jdbc.queryForObject("select pg_backend_pid()", Integer.class));
                rename(product, "Editor posterior", "NOTE-EDITOR-" + product);
            }));
            awaitBlockedEditor(editorPid, salePid.get());
            release.countDown();
            MvcResult result = saleRequest.get(15, TimeUnit.SECONDS);
            assertEquals(201, result.getResponse().getStatus());
            editor.get(15, TimeUnit.SECONDS);
            long sale = readJson(result).path("id").asLong();
            assertEquals(original.get("name"), items(sale).get(0).get("product_name_snapshot"));
            assertEquals(original.get("sku"), items(sale).get(0).get("sku_snapshot"));
            assertEquals("Editor posterior", identity(product).get("name"));
            assertEquals(1, jdbc.queryForObject("select count(*) from sales where cash_register_session_id=?", Integer.class, fixture.cash()));
            verify(target, times(1)).lockCatalog(fixture.products());
        } finally {
            release.countDown();
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"EMPTY", "WHITESPACE", "MAXIMUM"})
    void snapshotStorageDoesNotIntroduceStricterProductIdentityRules(String identityCase) throws Exception {
        Fixture fixture = fixture(1, false);
        long product = fixture.products().get(0);
        String name = switch (identityCase) {
            case "EMPTY" -> "";
            case "WHITESPACE" -> "  ";
            default -> "Ñ".repeat(180);
        };
        String sku = switch (identityCase) {
            case "EMPTY" -> "";
            case "WHITESPACE" -> "  ";
            default -> "N".repeat(60 - Long.toString(product).length()) + product;
        };
        // Direct fixture data models catalog history already permitted by its SQL schema.
        rename(product, name, sku);
        long sale = createSale(fixture, saleCommand(fixture));
        assertEquals(name, items(sale).get(0).get("product_name_snapshot"));
        assertEquals(sku, items(sale).get(0).get("sku_snapshot"));
    }

    @Test
    void ormUpdatesCannotOverwriteCapturedOrNullLegacyIdentity() throws Exception {
        Fixture fixture = fixture(1, false);
        long sale = createSale(fixture, saleCommand(fixture));
        long legacy = legacySale(fixture, new BigDecimal("0.125"));
        var capturedBefore = items(sale);
        var legacyBefore = items(legacy);
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            for (long id : List.of(((Number) capturedBefore.get(0).get("id")).longValue(),
                    ((Number) legacyBefore.get(0).get("id")).longValue())) {
                SaleItemEntity item = entityManager.find(SaleItemEntity.class, id);
                item.setProductNameSnapshot("Must not be persisted");
                item.setSkuSnapshot("MUST-NOT-CHANGE");
            }
            entityManager.flush();
            entityManager.clear();
        });
        assertEquals(capturedBefore, items(sale));
        assertEquals(legacyBefore, items(legacy));
    }

    @Test
    void getKeepsPreviousFieldsAndAddsReadOnlyIdentityAndQuantityAfterCashClosure() throws Exception {
        Fixture fixture = fixture(1, false);
        jdbc.update("update units set quantity_policy='DECIMAL_2' where id=(select unit_id from products where id=?)",
                fixture.products().get(0));
        ObjectNode command = saleCommand(fixture);
        ((ObjectNode) command.withArray("items").get(0)).put("quantity", new BigDecimal("1.25"));
        confirmSalePayload(command);
        long sale = createSale(fixture, command);
        Map<String, Object> stored = items(sale).get(0);
        var original = identity(fixture.products().get(0));
        closeCash(fixture.token(), fixture.cash(), new BigDecimal("100"), "NOTE-1A read");
        rename(fixture.products().get(0), "Nombre actual", "NOTE-CURRENT-" + sale);
        var effects = commercialState(fixture);

        JsonNode response = detail(fixture.token(), sale);
        assertEquals(Set.of("id", "cashRegisterSessionId", "warehouseId", "saleNumber", "status", "subtotalAmount",
                "discountAmount", "totalAmount", "paidAmount", "changeAmount", "soldAt", "voidedAt", "voidedByUserId",
                "voidReason", "createdBy", "items", "payments"), fieldNames(response));
        JsonNode line = response.path("items").get(0);
        assertEquals(Set.of("id", "productId", "productName", "sku", "barcode", "quantity", "unitPrice",
                "discountAmount", "lineTotal", "productNameSnapshot", "skuSnapshot", "quantityText"), fieldNames(line));
        assertEquals(((Number) stored.get("id")).longValue(), line.path("id").asLong());
        assertEquals(fixture.products().get(0).longValue(), line.path("productId").asLong());
        assertEquals("Nombre actual", line.path("productName").asText());
        assertEquals("NOTE-CURRENT-" + sale, line.path("sku").asText());
        assertEquals(original.get("barcode"), line.path("barcode").asText());
        assertTrue(line.path("quantity").isNumber());
        assertEquals(0, new BigDecimal("1.25").compareTo(line.path("quantity").decimalValue()));
        assertEquals(0, BigDecimal.TEN.compareTo(line.path("unitPrice").decimalValue()));
        assertEquals(0, BigDecimal.ZERO.compareTo(line.path("discountAmount").decimalValue()));
        assertEquals(0, new BigDecimal("12.50").compareTo(line.path("lineTotal").decimalValue()));
        assertEquals(((BigDecimal) stored.get("quantity")).toPlainString(), line.path("quantityText").asText());
        assertEquals(original.get("name"), line.path("productNameSnapshot").asText());
        assertEquals(original.get("sku"), line.path("skuSnapshot").asText());
        assertEquals("CASH", response.path("payments").get(0).path("paymentMethod").asText());
        assertEquals(0, new BigDecimal("100").compareTo(response.path("paidAmount").decimalValue()));
        assertEquals(0, new BigDecimal("87.50").compareTo(response.path("changeAmount").decimalValue()));
        assertEquals(effects, commercialState(fixture));
        assertEquals(List.of(stored), items(sale));
    }

    @ParameterizedTest
    @ValueSource(strings = {"1.000", "1.250", "0.125", "0.001", "1000.000", "9999999999999.999"})
    void quantityTextIsTheExactPersistedDecimalIncludingLegacyValues(String quantity) throws Exception {
        Fixture fixture = fixture(1, false);
        long sale = legacySale(fixture, new BigDecimal(quantity));
        var before = items(sale);
        JsonNode line = detail(fixture.token(), sale).path("items").get(0);
        assertEquals(((BigDecimal) before.get(0).get("quantity")).toPlainString(), line.path("quantityText").asText());
        assertEquals(quantity, line.path("quantityText").asText());
        assertTrue(line.path("quantity").isNumber(), "Keep the original numeric JSON contract");
        assertTrue(line.path("productNameSnapshot").isNull());
        assertTrue(line.path("skuSnapshot").isNull());
        assertEquals(before, items(sale));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "SUPERVISOR", "OWNER", "FOREIGN", "WAREHOUSE", "ANONYMOUS", "MISSING"})
    void saleGetPreservesAuthorizationAndNoStoreForSuccessAndErrors(String access) throws Exception {
        Fixture fixture = fixture(1, access.equals("OWNER"));
        long sale = createSale(fixture, saleCommand(fixture));
        String token = switch (access) {
            case "SUPERVISOR" -> login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);
            case "FOREIGN" -> login(CAJERO_EMAIL, CAJERO_PASSWORD);
            case "WAREHOUSE" -> login(ALMACENERO_EMAIL, ALMACENERO_PASSWORD);
            case "ANONYMOUS" -> null;
            default -> fixture.token();
        };
        int expected = switch (access) {
            case "FOREIGN" -> 422;
            case "WAREHOUSE" -> 403;
            case "ANONYMOUS" -> 401;
            case "MISSING" -> 404;
            default -> 200;
        };
        var before = items(sale);
        var effects = commercialState(fixture);
        MvcResult result = getSale(token, access.equals("MISSING") ? Long.MAX_VALUE : sale);
        assertEquals(expected, result.getResponse().getStatus());
        assertNoStore(result);
        if (expected == 200) {
            assertFalse(readJson(result).path("items").get(0).path("productNameSnapshot").isNull());
        } else {
            JsonNode error = readJson(result);
            assertFalse(error.has("items"));
            assertFalse(error.has("payments"));
            assertFalse(error.has("productNameSnapshot"));
            assertFalse(error.has("skuSnapshot"));
        }
        assertEquals(before, items(sale));
        assertEquals(effects, commercialState(fixture));
    }

    private Fixture fixture(int count, boolean cashierOwner) throws Exception {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = "N1A" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        long category = createCategory(admin, suffix);
        long unit = createUnit(admin, suffix);
        long warehouse = createWarehouse(admin, suffix);
        var products = new java.util.ArrayList<Long>();
        for (int index = 0; index < count; index++) {
            long product = createProduct(admin, category, unit, suffix + index, BigDecimal.TEN);
            registerInitialStock(admin, product, warehouse, BigDecimal.TEN, "Synthetic NOTE-1A stock");
            products.add(product);
        }
        String owner = cashierOwner ? login(CAJERO_EMAIL, CAJERO_PASSWORD) : admin;
        return new Fixture(owner, warehouse, openCash(owner, BigDecimal.ZERO, suffix), List.copyOf(products));
    }

    private ObjectNode saleCommand(Fixture fixture) {
        ObjectNode command = objectMapper.createObjectNode().put("warehouseId", fixture.warehouse());
        var lines = command.putArray("items");
        for (long product : fixture.products()) lines.addObject().put("productId", product).put("quantity", 1).put("discountAmount", 0);
        command.putArray("payments").addObject().put("paymentMethod", "CASH").put("amount", 100);
        confirmSalePayload(command);
        return command;
    }

    private void prepare(Fixture fixture, ObjectNode command) throws Exception {
        MvcResult rejected = prepareSaleFixture(fixture.token(), command);
        assertTrue(rejected == null, () -> "Synthetic preparation rejected with HTTP " + rejected.getResponse().getStatus());
    }

    private long createSale(Fixture fixture, ObjectNode command) throws Exception {
        prepare(fixture, command);
        MvcResult result = execute(fixture.token(), command);
        assertEquals(201, result.getResponse().getStatus());
        return readJson(result).path("id").asLong();
    }

    private MvcResult execute(String token, ObjectNode command) throws Exception {
        return mockMvc.perform(post("/api/v1/sales").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(command.toString())).andReturn();
    }

    private MvcResult getSale(String token, long sale) throws Exception {
        var request = get("/api/v1/sales/{id}", sale);
        if (token != null) request.header(HttpHeaders.AUTHORIZATION, bearer(token));
        return mockMvc.perform(request).andReturn();
    }

    private JsonNode detail(String token, long sale) throws Exception {
        MvcResult result = getSale(token, sale);
        assertEquals(200, result.getResponse().getStatus());
        assertNoStore(result);
        return readJson(result);
    }

    private MvcResult voidSale(String token, long sale) throws Exception {
        return mockMvc.perform(post("/api/v1/sales/{id}/void", sale).header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Synthetic NOTE-1A void\"}")).andReturn();
    }

    private long legacySale(Fixture fixture, BigDecimal quantity) {
        // Read/void fixture only: this does not claim current checkout accepts legacy/extreme fractions.
        long sale = jdbc.queryForObject("""
                insert into sales(cash_register_session_id,warehouse_id,sale_number,status,subtotal_amount,discount_amount,
                    total_amount,paid_amount,change_amount,sold_at,created_by)
                values(?,?,?,'COMPLETED',0,0,0,100,100,now(),
                    (select username from users where id=(select opened_by_user_id from cash_register_sessions where id=?))) returning id
                """, Long.class, fixture.cash(), fixture.warehouse(), "NOTE-LEGACY-" + UUID.randomUUID().toString().substring(0, 12), fixture.cash());
        jdbc.update("insert into sale_items(sale_id,product_id,quantity,unit_price,discount_amount,line_total) values(?,?,?,0,0,0)",
                sale, fixture.products().get(0), quantity);
        jdbc.update("insert into sale_payments(sale_id,payment_method,amount) values(?,'CASH',100)", sale);
        return sale;
    }

    private Map<String, Object> identity(long product) {
        return jdbc.queryForMap("select name,sku,barcode from products where id=?", product);
    }

    private void rename(long product, String name, String sku) {
        assertEquals(1, jdbc.update("update products set name=?,sku=? where id=?", name, sku, product));
    }

    private List<Map<String, Object>> items(long sale) {
        return jdbc.queryForList("select * from sale_items where sale_id=? order by product_id", sale);
    }

    private Map<String, Object> headerAmounts(long sale) {
        return jdbc.queryForMap("select subtotal_amount,discount_amount,total_amount,paid_amount,change_amount from sales where id=?", sale);
    }

    private String operationHash(ObjectNode command) {
        return jdbc.queryForObject("select request_hash from sale_operations where operation_id=?", String.class,
                UUID.fromString(command.path("operationId").asText()));
    }

    private Map<String, Object> commercialState(Fixture fixture) {
        return jdbc.queryForMap("""
                select (select count(*) from sales where cash_register_session_id=?) sales,
                    (select count(*) from sale_items i join sales s on s.id=i.sale_id where s.cash_register_session_id=?) items,
                    (select count(*) from sale_payments p join sales s on s.id=p.sale_id where s.cash_register_session_id=?) payments,
                    (select coalesce(sum(p.amount),0) from sale_payments p join sales s on s.id=p.sale_id where s.cash_register_session_id=?) paid,
                    (select count(*) from inventory_movements where warehouse_id=?) movements,
                    (select sum(quantity) from stock_balances where warehouse_id=?) stock,
                    (select count(*) from sale_operations where original_cash_session_id=?) operations
                """, fixture.cash(), fixture.cash(), fixture.cash(), fixture.cash(), fixture.warehouse(), fixture.warehouse(), fixture.cash());
    }

    private Set<String> fieldNames(JsonNode node) {
        Set<String> names = new HashSet<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    private void assertNoStore(MvcResult result) {
        String cache = result.getResponse().getHeader(HttpHeaders.CACHE_CONTROL);
        assertNotNull(cache);
        assertTrue(cache.contains("no-store"), "The existing security chain must keep sale responses out of caches");
    }

    private void awaitBlockedEditor(AtomicInteger editorPid, int salePid) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
        while (System.nanoTime() < deadline) {
            if (editorPid.get() != 0 && Boolean.TRUE.equals(jdbc.queryForObject(
                    "select ? = any(pg_blocking_pids(?))", Boolean.class, salePid, editorPid.get()))) return;
            LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
        }
        fail("PostgreSQL must identify the checkout transaction as the catalog editor's blocker");
    }
}
