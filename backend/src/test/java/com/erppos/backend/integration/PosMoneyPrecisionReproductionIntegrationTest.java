package com.erppos.backend.integration;

import com.erppos.backend.erp.sales.adapter.dto.CreateSaleRequest;
import com.erppos.backend.erp.shared.domain.policy.QuantityPolicy;
import com.erppos.backend.erp.sales.domain.port.InventorySalesPort;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import java.time.LocalDate;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.port.SaleRepositoryPort;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MvcResult;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.net.URI;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MONEY-CORE-P0 regressions adapted from the preserved, originally-red MONEY-QA-0 reproductions.
 * Reuses the disposable PostgreSQL 16 container and HTTP fixtures, never a deployed backend.
 */
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Timeout(60)
class PosMoneyPrecisionReproductionIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private DataSource dataSource;
    @Autowired
    private Environment environment;
    @Autowired
    private Validator validator;
    @MockitoSpyBean
    private SaleRepositoryPort saleRepository;
    @MockitoSpyBean
    private InventorySalesPort inventory;

    private record Fixture(String token, long warehouse, long cash, long unit, List<Long> products) {}
    private record Payment(String method, BigDecimal amount) {}

    @Override
    @BeforeEach
    void cleanupOpenCashSessionsForSharedSeedUsers() throws Exception {
        // The inherited DynamicPropertySource binds BOTH URLs directly to POSTGRES.getJdbcUrl().
        // Check the live connection before even the inherited synthetic-user cleanup can write.
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            assertEquals(environment.getRequiredProperty("spring.datasource.url"), url);
            assertEquals(environment.getRequiredProperty("spring.flyway.url"), url);
            URI address = URI.create(url.substring("jdbc:".length()));
            assertTrue(Set.of("localhost", "127.0.0.1", "[::1]").contains(address.getHost()),
                    "Only the local disposable PostgreSQL Testcontainer is permitted");
            assertEquals("/test", address.getPath());
            assertTrue(address.getPort() > 0);
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());
            evidence("ISOLATION", Map.of("jdbcUrl", url, "flywayUsesSameContainer", true,
                    "databaseProduct", connection.getMetaData().getDatabaseProductName()));
        }
        super.cleanupOpenCashSessionsForSharedSeedUsers();
    }

    @Test
    void caseA_paymentPrecisionIsRejectedBeforeAnyWrite() throws Exception {
        Fixture f = fixture(new BigDecimal("1.01"));
        Map<String, Object> before = snapshot(f);
        MvcResult result = createSale("A", f, List.of(BigDecimal.ONE), List.of(
                new Payment("CARD", new BigDecimal("0.505")),
                new Payment("CARD", new BigDecimal("0.505"))));
        assertRejected("A", f, before, result);
    }

    @Test
    void caseB_persistedLineTotalsMustSumToPersistedSaleTotal() throws Exception {
        Fixture f = fixture(QuantityPolicy.DECIMAL_2, new BigDecimal("0.01"), new BigDecimal("0.01"));
        Map<String, Object> before = snapshot(f);
        MvcResult result = createSale("B", f, List.of(new BigDecimal("0.5"), new BigDecimal("0.5")),
                List.of(new Payment("CASH", new BigDecimal("0.02"))));
        assertEquals(201, result.getResponse().getStatus());

        Sale calculated = capturedBeforePersistence();
        JsonNode response = readJson(result);
        long saleId = response.path("id").asLong();
        Map<String, Object> header = header(saleId);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT quantity, unit_price, discount_amount, line_total FROM sale_items WHERE sale_id = ? ORDER BY id", saleId);
        BigDecimal lines = sum(rows, "line_total");
        BigDecimal total = decimal(header, "total_amount");
        evidence("B", Map.of(
                "httpStatus", result.getResponse().getStatus(),
                "beforePersistence", Map.of("subtotal", calculated.subtotalAmount(), "total", calculated.totalAmount(),
                        "lines", calculated.items().stream().map(i -> i.lineTotal()).toList()),
                "response", monetaryResponse(response), "persistedHeader", header,
                "persistedLines", rows, "lineSum", lines, "lineMinusHeader", lines.subtract(total)));

        money(new BigDecimal("0.02"), total, "B expected total");
        rows.forEach(row -> money(new BigDecimal("0.01"), decimal(row, "line_total"), "HALF_UP per line"));
        money(new BigDecimal("0.02"), decimal(header, "paid_amount"), "B paid");
        money(total, lines, "B: sum of persisted line totals must equal persisted total_amount");
    }

    @Test
    void caseC_excessQuantityPrecisionIsRejectedWithoutWrites() throws Exception {
        Fixture f = fixture(QuantityPolicy.DECIMAL_2, BigDecimal.TEN);
        Map<String, Object> before = snapshot(f);
        assertRejected("C", f, before, createSale("C", f, List.of(new BigDecimal("0.0005")),
                List.of(new Payment("CASH", new BigDecimal("0.01")))));
    }

    @Test
    void validFractionVoidRestoresStockAndMovementDeltasAreSymmetric() throws Exception {
        Fixture f = fixture(QuantityPolicy.DECIMAL_2, BigDecimal.TEN);
        BigDecimal initial = stock(f);
        MvcResult result = createSale("C", f, List.of(new BigDecimal("0.25")),
                List.of(new Payment("CASH", new BigDecimal("2.50"))));
        assertEquals(201, result.getResponse().getStatus());

        Sale calculated = capturedBeforePersistence();
        JsonNode response = readJson(result);
        long saleId = response.path("id").asLong();
        BigDecimal storedQuantity = jdbc.queryForObject(
                "SELECT quantity FROM sale_items WHERE sale_id = ?", BigDecimal.class, saleId);
        BigDecimal afterSale = stock(f);
        ObjectNode payload = objectMapper.createObjectNode().put("reason", "MONEY-QA-0 synthetic reversal");
        MvcResult voided = mockMvc.perform(post("/api/v1/sales/{id}/void", saleId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                        .contentType(MediaType.APPLICATION_JSON).content(payload.toString()))
                .andExpect(status().isOk()).andReturn();
        BigDecimal afterVoid = stock(f);
        List<Map<String, Object>> movements = jdbc.queryForList("""
                SELECT movement_type, quantity, previous_stock, new_stock FROM inventory_movements
                WHERE warehouse_id = ? AND product_id = ? AND reference_type IN ('SALE', 'SALE_VOID') ORDER BY id
                """, f.warehouse(), f.products().get(0));
        JsonNode fetched = readJson(mockMvc.perform(get("/api/v1/sales/{id}", saleId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(f.token())))
                .andExpect(status().isOk()).andReturn());
        evidence("C", Map.of(
                "httpStatus", result.getResponse().getStatus(),
                "voidHttpStatus", voided.getResponse().getStatus(),
                "beforePersistence", Map.of("quantity", calculated.items().get(0).quantity(),
                        "total", calculated.totalAmount(), "change", calculated.changeAmount()),
                "response", monetaryResponse(response), "persistedQuantity", storedQuantity,
                "stock", Map.of("initial", initial, "afterSale", afterSale, "afterVoid", afterVoid,
                        "netDifference", afterVoid.subtract(initial)),
                "movements", movements, "finalStatus", fetched.path("status").asText()));
        assertEquals(2, movements.size(), "One SALE_OUT and one SALE_VOID_IN movement must exist");
        Map<String, Object> out = movements.get(0);
        Map<String, Object> in = movements.get(1);
        assertAll("C: sale/void quantity and stock invariants",
                () -> money(initial, afterVoid, "Void must restore exactly the initial stock"),
                () -> money(storedQuantity, initial.subtract(afterSale), "Stock decrease must equal persisted sold quantity"),
                () -> money(decimal(out, "quantity"), decimal(out, "previous_stock").subtract(decimal(out, "new_stock")),
                        "SALE_OUT quantity must equal its actual stock delta"),
                () -> money(decimal(in, "quantity"), decimal(in, "new_stock").subtract(decimal(in, "previous_stock")),
                        "SALE_VOID_IN quantity must equal its actual stock delta"));
    }


    @Test
    void wholeAndLegacyFractionsAreRejectedButIntegersRemainValid() throws Exception {
        for (QuantityPolicy policy : List.of(QuantityPolicy.WHOLE, QuantityPolicy.LEGACY_UNCLASSIFIED)) {
            Fixture f = fixture(policy, BigDecimal.TEN);
            var before = snapshot(f);
            assertRejected(policy.name(), f, before, createSale(policy.name(), f, List.of(new BigDecimal("0.25")),
                    List.of(new Payment("CASH", new BigDecimal("2.50")))));
            assertEquals(201, createSale("integer", f, List.of(BigDecimal.ONE),
                    List.of(new Payment("CARD", BigDecimal.TEN))).getResponse().getStatus());
            ensureNoOpenCash(f.token());
        }
    }

    @Test
    void historicalThreeDecimalVoidDoesNotRevalidateCurrentUnitPolicy() throws Exception {
        Fixture f = fixture(QuantityPolicy.DECIMAL_2, BigDecimal.TEN);
        long saleId = readJson(createSale("historical seed", f, List.of(BigDecimal.ONE),
                List.of(new Payment("CASH", BigDecimal.TEN)))).path("id").asLong();
        // Build a coherent historical fixture, not a new business operation with three decimals.
        jdbc.update("UPDATE sale_items SET quantity = 0.125, line_total = 1.25 WHERE sale_id = ?", saleId);
        jdbc.update("UPDATE sales SET subtotal_amount = 1.25, total_amount = 1.25, paid_amount = 1.25 WHERE id = ?", saleId);
        jdbc.update("UPDATE sale_payments SET amount = 1.25 WHERE sale_id = ?", saleId);
        jdbc.update("UPDATE stock_balances SET quantity = 9.875 WHERE warehouse_id = ? AND product_id = ?", f.warehouse(), f.products().get(0));
        jdbc.update("UPDATE inventory_movements SET quantity = 0.125, previous_stock = 10, new_stock = 9.875 WHERE warehouse_id = ? AND reference_type = 'SALE'", f.warehouse());
        jdbc.update("UPDATE units SET quantity_policy = 'WHOLE' WHERE id = ?", f.unit());
        mockMvc.perform(post("/api/v1/sales/{id}/void", saleId).header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Synthetic historical reversal\"}"))
                .andExpect(status().isOk());
        money(BigDecimal.TEN, stock(f), "Historical reversal");
        var rows = jdbc.queryForList("SELECT quantity FROM inventory_movements WHERE warehouse_id = ? AND reference_type IN ('SALE','SALE_VOID') ORDER BY id", f.warehouse());
        assertEquals(2, rows.size());
        rows.forEach(row -> money(new BigDecimal("0.125"), decimal(row, "quantity"), "Historical movement"));
    }

    @Test
    void inventoryFailureRollsBackSalePaymentsAndEarlierStockMovement() throws Exception {
        Fixture f = fixture(BigDecimal.TEN, BigDecimal.TEN);
        var before = snapshot(f);
        failSecondMovement(f);
        assertRejected("rollback", f, before, createSale("rollback", f, List.of(BigDecimal.ONE, BigDecimal.ONE),
                List.of(new Payment("CASH", new BigDecimal("20")))));
        verify(saleRepository).save(any(Sale.class));
        verify(inventory).registerSaleOut(eq(f.products().get(0)), anyLong(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void aggregateOverflowAndAccidentalZeroAreRejectedBeforeWrites() throws Exception {
        Fixture f = fixture(new BigDecimal("999999999999.99"), new BigDecimal("0.01"));
        assertRejected("aggregate overflow", f, snapshot(f), createSale("aggregate overflow", f,
                List.of(BigDecimal.ONE, BigDecimal.ONE), List.of(new Payment("CASH", new BigDecimal("999999999999.99")))));
        ensureNoOpenCash(f.token());
        Fixture tiny = fixture(QuantityPolicy.DECIMAL_2, new BigDecimal("0.01"));
        assertRejected("accidental zero", tiny, snapshot(tiny), createSale("accidental zero", tiny,
                List.of(new BigDecimal("0.25")), List.of(new Payment("CASH", new BigDecimal("0.01")))));
    }

    @Test
    void cashPrecisionIsValidatedBeforeOpenOrCloseWrites() throws Exception {
        Fixture f = fixture(BigDecimal.TEN);
        var before = snapshot(f);
        mockMvc.perform(post("/api/v1/cash-registers/{id}/close", f.cash())
                .header(HttpHeaders.AUTHORIZATION, bearer(f.token())).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedAmount\":0.001}")).andExpect(status().isUnprocessableEntity());
        assertEquals(before, snapshot(f));
        ensureNoOpenCash(f.token());
        mockMvc.perform(post("/api/v1/cash-registers/open").header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                .contentType(MediaType.APPLICATION_JSON).content("{\"openingAmount\":0.001}"))
                .andExpect(status().isUnprocessableEntity());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM cash_register_sessions WHERE status = 'OPEN'", Integer.class));
    }

    @Test
    void quotesUseRoundedLinesAndConversionSharesSaleValidation() throws Exception {
        Fixture f = fixture(QuantityPolicy.DECIMAL_2, new BigDecimal("0.01"), new BigDecimal("0.01"));
        ObjectNode request = quoteRequest(f, new BigDecimal("0.50"));
        MvcResult created = quoteHttp(f, request, null);
        assertEquals(201, created.getResponse().getStatus());
        long quoteId = readJson(created).path("id").asLong();
        money(new BigDecimal("0.02"), readJson(created).path("totalAmount").decimalValue(), "Quote rounded total");
        assertEquals(200, quoteHttp(f, request, quoteId).getResponse().getStatus());
        var before = snapshot(f);
        var quoteBefore = quoteSnapshot(quoteId);
        assertEquals(422, convert(f, quoteId, new BigDecimal("0.005")).getResponse().getStatus());
        assertEquals(before, snapshot(f));
        assertEquals(quoteBefore, quoteSnapshot(quoteId));
        MvcResult converted = convert(f, quoteId, new BigDecimal("0.02"));
        assertEquals(200, converted.getResponse().getStatus());
        long saleId = readJson(converted).path("convertedSaleId").asLong();
        money(new BigDecimal("0.02"), decimal(header(saleId), "total_amount"), "Converted sale total");
        money(new BigDecimal("0.02"), jdbc.queryForObject("SELECT SUM(line_total) FROM sale_items WHERE sale_id = ?", BigDecimal.class, saleId), "Converted lines");
    }

    @Test
    void incompatibleHistoricalQuoteRemainsReadableAndCannotConvert() throws Exception {
        Fixture f = fixture(QuantityPolicy.DECIMAL_2, BigDecimal.TEN);
        long quoteId = readJson(quoteHttp(f, quoteRequest(f, new BigDecimal("0.25")), null)).path("id").asLong();
        jdbc.update("UPDATE quote_items SET quantity = 0.125, line_total = 1.25 WHERE quote_id = ?", quoteId);
        jdbc.update("UPDATE quotes SET subtotal_amount = 1.25, total_amount = 1.25 WHERE id = ?", quoteId);
        jdbc.update("UPDATE units SET quantity_policy = 'WHOLE' WHERE id = ?", f.unit());
        var before = snapshot(f);
        var quoteBefore = quoteSnapshot(quoteId);
        mockMvc.perform(get("/api/v1/quotes/{id}", quoteId).header(HttpHeaders.AUTHORIZATION, bearer(f.token()))).andExpect(status().isOk());
        assertEquals(422, convert(f, quoteId, new BigDecimal("1.25")).getResponse().getStatus());
        assertEquals(before, snapshot(f));
        assertEquals(quoteBefore, quoteSnapshot(quoteId));
    }

    @Test
    void quoteRejectsInvalidCreateEditAndRollsBackFailedConversion() throws Exception {
        Fixture f = fixture(BigDecimal.TEN, BigDecimal.TEN);
        ObjectNode invalid = quoteRequest(f, new BigDecimal("0.25"));
        assertEquals(422, quoteHttp(f, invalid, null).getResponse().getStatus());
        ObjectNode request = quoteRequest(f, BigDecimal.ONE);
        long quoteId = readJson(quoteHttp(f, request, null)).path("id").asLong();
        var quoteBefore = quoteSnapshot(quoteId);
        request.withArray("items").get(0).deepCopy();
        ((ObjectNode) request.withArray("items").get(0)).put("discountAmount", new BigDecimal("0.005"));
        assertEquals(422, quoteHttp(f, request, quoteId).getResponse().getStatus());
        assertEquals(quoteBefore, quoteSnapshot(quoteId));
        var before = snapshot(f);
        failSecondMovement(f);
        assertEquals(422, convert(f, quoteId, new BigDecimal("20")).getResponse().getStatus());
        assertEquals(before, snapshot(f));
        assertEquals(quoteBefore, quoteSnapshot(quoteId));
    }

    private void failSecondMovement(Fixture f) {
        doThrow(new SalesBusinessRuleException("Synthetic transaction failure")).when(inventory)
                .registerSaleOut(eq(f.products().get(1)), anyLong(), any(), anyString(), anyString(), anyString());
    }

    private Map<String, Object> quoteSnapshot(long id) {
        return Map.of("quote", jdbc.queryForMap("SELECT status, converted_sale_id, subtotal_amount, discount_amount, total_amount FROM quotes WHERE id = ?", id),
                "items", jdbc.queryForList("SELECT quantity, discount_amount, line_total FROM quote_items WHERE quote_id = ? ORDER BY id", id),
                "history", jdbc.queryForObject("SELECT COUNT(*) FROM quote_status_history WHERE quote_id = ?", Integer.class, id));
    }

    private ObjectNode quoteRequest(Fixture f, BigDecimal quantity) {
        ObjectNode payload = objectMapper.createObjectNode().put("customerName", "Synthetic money QA")
                .put("expiresAt", LocalDate.now().plusDays(1).toString());
        var items = payload.putArray("items");
        f.products().forEach(id -> items.addObject().put("productId", id).put("quantity", quantity).put("discountAmount", 0));
        return payload;
    }

    private MvcResult quoteHttp(Fixture f, ObjectNode payload, Long id) throws Exception {
        return mockMvc.perform((id == null ? post("/api/v1/quotes") : put("/api/v1/quotes/{id}", id))
                .header(HttpHeaders.AUTHORIZATION, bearer(f.token())).contentType(MediaType.APPLICATION_JSON)
                .content(payload.toString())).andReturn();
    }

    private MvcResult convert(Fixture f, long id, BigDecimal payment) throws Exception {
        ObjectNode request = objectMapper.createObjectNode().put("warehouseId", f.warehouse());
        request.putArray("payments").addObject().put("paymentMethod", "CASH").put("amount", payment);
        return mockMvc.perform(post("/api/v1/quotes/{id}/convert-to-sale", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(f.token())).contentType(MediaType.APPLICATION_JSON)
                .content(request.toString())).andReturn();
    }

    private Fixture fixture(BigDecimal... prices) throws Exception {
        return fixture(QuantityPolicy.WHOLE, prices);
    }

    private Fixture fixture(QuantityPolicy policy, BigDecimal... prices) throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = "MQ" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        long category = createCategory(token, suffix);
        long unit = createUnit(token, suffix);
        // Synthetic isolated fixture: explicit fractional classification or a pre-migration legacy row.
        jdbc.update("UPDATE units SET quantity_policy = ? WHERE id = ?", policy.storageValue(), unit);
        long warehouse = createWarehouse(token, suffix);
        var products = new java.util.ArrayList<Long>();
        for (int i = 0; i < prices.length; i++) {
            long product = createProduct(token, category, unit, suffix + i, prices[i]);
            registerInitialStock(token, product, warehouse, BigDecimal.TEN, "MONEY-QA-0 synthetic stock");
            products.add(product);
        }
        long cash = openCash(token, BigDecimal.ZERO, suffix);
        return new Fixture(token, warehouse, cash, unit, List.copyOf(products));
    }

    private MvcResult createSale(String scenario, Fixture f, List<BigDecimal> quantities,
                                 List<Payment> payments) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode().put("warehouseId", f.warehouse());
        var items = payload.putArray("items");
        for (int i = 0; i < f.products().size(); i++) {
            items.addObject().put("productId", f.products().get(i)).put("quantity", quantities.get(i))
                    .put("discountAmount", BigDecimal.ZERO);
        }
        var paymentNodes = payload.putArray("payments");
        for (Payment payment : payments) {
            paymentNodes.addObject().put("paymentMethod", payment.method()).put("amount", payment.amount());
        }
        var violations = validator.validate(objectMapper.treeToValue(payload, CreateSaleRequest.class));
        evidence(scenario + "_INPUT", Map.of("quantities", quantities, "payments", paymentNodes,
                "validationViolations", violations.stream().map(v -> v.getPropertyPath() + ": " + v.getMessage()).toList()));
        return mockMvc.perform(post("/api/v1/sales")
                        .header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                        .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andReturn();
    }

    private void assertRejected(String scenario, Fixture f, Map<String, Object> before, MvcResult result) throws Exception {
        assertEquals(422, result.getResponse().getStatus(), scenario + " must reject at the application boundary");
        assertEquals(before, snapshot(f), "Rejected input must not leave partial writes");
        evidence(scenario, Map.of("httpStatus", 422, "writesUnchanged", true));
    }

    private Sale capturedBeforePersistence() {
        var captured = ArgumentCaptor.forClass(Sale.class);
        verify(saleRepository).save(captured.capture());
        return captured.getValue();
    }

    private Map<String, Object> header(long saleId) {
        return jdbc.queryForMap("""
                SELECT subtotal_amount, discount_amount, total_amount, paid_amount, change_amount
                FROM sales WHERE id = ?
                """, saleId);
    }

    private Map<String, Object> snapshot(Fixture f) {
        return Map.of("cash", jdbc.queryForMap("SELECT status, opening_amount, counted_amount, expected_cash_amount, difference_amount FROM cash_register_sessions WHERE id = ?", f.cash()),
                "records", jdbc.queryForMap("""
                SELECT (SELECT COUNT(*) FROM sales WHERE cash_register_session_id = ?) AS sales,
                       (SELECT COUNT(*) FROM sale_items i JOIN sales s ON s.id = i.sale_id
                        WHERE s.cash_register_session_id = ?) AS items,
                       (SELECT COUNT(*) FROM sale_payments p JOIN sales s ON s.id = p.sale_id
                        WHERE s.cash_register_session_id = ?) AS payments,
                       (SELECT COUNT(*) FROM inventory_movements WHERE warehouse_id = ?) AS movements
                """, f.cash(), f.cash(), f.cash(), f.warehouse()),
                "stock", jdbc.queryForList("SELECT product_id, quantity FROM stock_balances WHERE warehouse_id = ? ORDER BY product_id",
                        f.warehouse()));
    }

    private BigDecimal stock(Fixture f) {
        return jdbc.queryForObject("SELECT quantity FROM stock_balances WHERE warehouse_id = ? AND product_id = ?",
                BigDecimal.class, f.warehouse(), f.products().get(0));
    }

    private Map<String, Object> monetaryResponse(JsonNode response) {
        Map<String, Object> values = new LinkedHashMap<>();
        for (String field : List.of("subtotalAmount", "discountAmount", "totalAmount", "paidAmount", "changeAmount")) {
            values.put(field, response.path(field).decimalValue());
        }
        return values;
    }

    private BigDecimal sum(List<Map<String, Object>> rows, String field) {
        return rows.stream().map(row -> decimal(row, field)).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal decimal(Map<String, Object> row, String field) {
        return (BigDecimal) row.get(field);
    }

    private void evidence(String scenario, Map<String, ?> values) throws Exception {
        System.out.println("MONEY-QA-0 " + scenario + " " + objectMapper.writeValueAsString(values));
    }

    private static void money(BigDecimal expected, BigDecimal actual, String invariant) {
        assertNotNull(actual);
        assertEquals(0, expected.compareTo(actual),
                () -> invariant + ": expected=" + expected.toPlainString() + ", actual=" + actual.toPlainString()
                        + ", difference=" + actual.subtract(expected).toPlainString());
    }
}
