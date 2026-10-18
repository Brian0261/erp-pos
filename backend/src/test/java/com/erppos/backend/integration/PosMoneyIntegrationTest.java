package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Synthetic sales only, in the existing disposable PostgreSQL Testcontainer. */
class PosMoneyIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private PlatformTransactionManager transactionManager;

    private record Payment(String method, int amount) {}
    private record Fixture(String token, long warehouse, long product, long cash) {}

    static Stream<Arguments> scenarios() {
        return Stream.of(
                Arguments.of("A", List.of(new Payment("CASH", 100)), true, 0),
                Arguments.of("B", List.of(new Payment("CASH", 120)), true, 20),
                Arguments.of("C", List.of(new Payment("CARD", 100)), true, 0),
                Arguments.of("D", List.of(new Payment("CARD", 120)), false, 0),
                Arguments.of("E", List.of(new Payment("CARD", 80), new Payment("CASH", 30)), true, 10),
                Arguments.of("F", List.of(new Payment("CARD", 110), new Payment("CASH", 10)), false, 0),
                Arguments.of("G", List.of(new Payment("CASH", 90)), false, 0),
                Arguments.of("H", List.of(new Payment("TRANSFER", 120)), false, 0));
    }

    @ParameterizedTest(name = "persisted payment policy {0}")
    @MethodSource("scenarios")
    void shouldPersistValidPaymentsOrRejectWithoutPartialRecords(String scenario, List<Payment> payments,
                                                               boolean accepted, int change) throws Exception {
        Fixture f = fixture(0);
        Map<String, Object> before = snapshot(f);
        MvcResult result = createSale(f, payments);
        if (!accepted) {
            assertEquals(422, result.getResponse().getStatus());
            assertEquals(before, snapshot(f), "Rejected sale must leave sales, items, payments, stock and movements unchanged");
            return;
        }
        assertEquals(201, result.getResponse().getStatus());
        JsonNode response = readJson(result);
        long saleId = response.path("id").asLong();
        int paid = payments.stream().mapToInt(Payment::amount).sum();
        money(100, response.path("totalAmount").decimalValue());
        money(paid, response.path("paidAmount").decimalValue());
        money(change, response.path("changeAmount").decimalValue());
        MvcResult fetched = mockMvc.perform(get("/api/v1/sales/{id}", saleId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(f.token())))
                .andExpect(status().isOk()).andReturn();
        money(paid, readJson(fetched).path("paidAmount").decimalValue());
        money(change, readJson(fetched).path("changeAmount").decimalValue());
        Map<String, Object> persisted = jdbc.queryForMap("SELECT paid_amount, change_amount FROM sales WHERE id = ?", saleId);
        money(paid, (BigDecimal) persisted.get("paid_amount"));
        money(change, (BigDecimal) persisted.get("change_amount"));
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT payment_method, amount, reference FROM sale_payments WHERE sale_id = ? ORDER BY id", saleId);
        assertEquals(payments.size(), rows.size());
        for (int i = 0; i < payments.size(); i++) {
            assertEquals(payments.get(i).method(), rows.get(i).get("payment_method"));
            money(payments.get(i).amount(), (BigDecimal) rows.get(i).get("amount"));
            assertEquals("QA-" + i, rows.get(i).get("reference"));
            assertEquals(payments.get(i).method(), response.path("payments").get(i).path("paymentMethod").asText());
        }
        money(9, jdbc.queryForObject("SELECT quantity FROM stock_balances WHERE product_id = ? AND warehouse_id = ?",
                BigDecimal.class, f.product(), f.warehouse()));
        int cash = payments.stream().filter(p -> p.method().equals("CASH")).mapToInt(Payment::amount).sum();
        assertTrue(change >= 0 && change <= cash);
        assertClosedCash(f, cash - change);
    }

    @Test
    void shouldRollbackAllSalePaymentAndInventoryWritesWhenTheTransactionAborts() throws Exception {
        Fixture f = fixture(0);
        Map<String, Object> before = snapshot(f);
        new TransactionTemplate(transactionManager).executeWithoutResult(transaction -> {
            try {
                MvcResult result = createSale(f, List.of(new Payment("TRANSFER", 40),
                        new Payment("CARD", 40), new Payment("CASH", 30)));
                assertEquals(201, result.getResponse().getStatus());
                assertNotEquals(before, snapshot(f), "The test must actually persist before aborting");
                transaction.setRollbackOnly();
            } catch (Exception exception) {
                throw new AssertionError(exception);
            }
        });
        assertEquals(before, snapshot(f), "Rollback must restore all sale, payment and inventory records");
    }

    @Test
    void shouldIncludeOpeningAndSubtractChangeExactlyOnceForMultipleCashLines() throws Exception {
        Fixture f = fixture(50);
        MvcResult result = createSale(f, List.of(new Payment("CASH", 60), new Payment("CASH", 60)));
        assertEquals(201, result.getResponse().getStatus());
        money(20, readJson(result).path("changeAmount").decimalValue());
        assertClosedCash(f, 150);
    }

    @Test
    void shouldExcludeBothPaymentsAndChangeOfVoidedSalesAndOtherSessions() throws Exception {
        Fixture other = fixture(0);
        assertEquals(201, createSale(other, List.of(new Payment("CASH", 120))).getResponse().getStatus());
        assertClosedCash(other, 100);

        Fixture f = fixture(0);
        MvcResult voidable = createSale(f, List.of(new Payment("CASH", 120)));
        assertEquals(201, voidable.getResponse().getStatus());
        long voidId = readJson(voidable).path("id").asLong();
        mockMvc.perform(post("/api/v1/sales/{id}/void", voidId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Synthetic money QA\"}"))
                .andExpect(status().isOk());
        assertEquals(201, createSale(f, List.of(new Payment("CARD", 80), new Payment("CASH", 30)))
                .getResponse().getStatus());
        assertClosedCash(f, 20);
    }

    private Fixture fixture(int opening) throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = "M" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        long category = createCategory(token, suffix);
        long unit = createUnit(token, suffix);
        long warehouse = createWarehouse(token, suffix);
        long product = createProduct(token, category, unit, suffix, BigDecimal.valueOf(100));
        registerInitialStock(token, product, warehouse, BigDecimal.TEN, "Synthetic money QA");
        long cash = openCash(token, BigDecimal.valueOf(opening), suffix);
        return new Fixture(token, warehouse, product, cash);
    }

    private MvcResult createSale(Fixture f, List<Payment> payments) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("warehouseId", f.warehouse());
        ObjectNode item = payload.putArray("items").addObject();
        item.put("productId", f.product());
        item.put("quantity", 1);
        item.put("discountAmount", 0);
        var array = payload.putArray("payments");
        for (int i = 0; i < payments.size(); i++) {
            ObjectNode payment = array.addObject();
            payment.put("paymentMethod", payments.get(i).method());
            payment.put("amount", payments.get(i).amount());
            payment.put("reference", "QA-" + i);
        }
        confirmSalePayload(payload);
        return mockMvc.perform(post("/api/v1/sales")
                        .header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                        .contentType(MediaType.APPLICATION_JSON).content(payload.toString())).andReturn();
    }

    private Map<String, Object> snapshot(Fixture f) {
        return jdbc.queryForMap("""
                SELECT (SELECT COUNT(*) FROM sales WHERE cash_register_session_id = ?) AS sales,
                       (SELECT COUNT(*) FROM sale_items WHERE product_id = ?) AS items,
                       (SELECT COUNT(*) FROM sale_payments p JOIN sales s ON s.id = p.sale_id
                        WHERE s.cash_register_session_id = ?) AS payments,
                       (SELECT COUNT(*) FROM inventory_movements WHERE product_id = ? AND warehouse_id = ?) AS movements,
                       (SELECT quantity FROM stock_balances WHERE product_id = ? AND warehouse_id = ?) AS stock
                """, f.cash(), f.product(), f.cash(), f.product(), f.warehouse(), f.product(), f.warehouse());
    }

    private void assertClosedCash(Fixture f, int expected) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("countedAmount", expected);
        MvcResult result = mockMvc.perform(post("/api/v1/cash-registers/{id}/close", f.cash())
                        .header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                        .contentType(MediaType.APPLICATION_JSON).content(payload.toString()))
                .andExpect(status().isOk()).andReturn();
        money(expected, readJson(result).path("expectedCashAmount").decimalValue());
        money(0, readJson(result).path("differenceAmount").decimalValue());
        Map<String, Object> persisted = jdbc.queryForMap(
                "SELECT expected_cash_amount, difference_amount FROM cash_register_sessions WHERE id = ?", f.cash());
        money(expected, (BigDecimal) persisted.get("expected_cash_amount"));
        money(0, (BigDecimal) persisted.get("difference_amount"));
    }

    private static void money(int expected, BigDecimal actual) {
        assertNotNull(actual);
        assertEquals(0, BigDecimal.valueOf(expected).compareTo(actual), () -> "Expected " + expected + " but got " + actual);
    }
}
