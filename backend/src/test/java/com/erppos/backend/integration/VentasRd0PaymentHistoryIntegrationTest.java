package com.erppos.backend.integration;

import com.erppos.backend.erp.sales.domain.exception.SalesConflictException;
import com.erppos.backend.erp.sales.domain.model.PaymentMethod;
import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SalePayment;
import com.erppos.backend.erp.sales.domain.port.SaleRepositoryPort;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** VENTAS-RD-0A. All writes target AbstractHttpIntegrationTest's disposable PostgreSQL. */
class VentasRd0PaymentHistoryIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @Autowired SaleRepositoryPort sales;
    @jakarta.persistence.PersistenceContext jakarta.persistence.EntityManager entityManager;

    private record Fixture(String token, long sale, long cash, long product, long warehouse) {}

    @Test
    void mixedPaymentsKeepTheirExactPostgresRowsThroughVoidAndSecondAttempt() throws Exception {
        var f = fixture();
        var payments = payments(f.sale());
        assertEquals(3, payments.size());
        var amounts = amounts(f.sale());
        var soldAt = jdbc.queryForObject("select sold_at from sales where id=?", Object.class, f.sale());
        assertEquals(new BigDecimal("9.000"), stock(f));
        var result = voidSale(f);
        assertEquals(200, result.getResponse().getStatus());
        assertEquals("VOIDED", readJson(result).path("status").asText());
        assertEquals(payments, payments(f.sale()), "IDs, timestamps, attributes AND PostgreSQL xmin must stay identical");
        assertEquals(amounts, amounts(f.sale()));
        assertEquals(soldAt, jdbc.queryForObject("select sold_at from sales where id=?", Object.class, f.sale()));
        var audit = jdbc.queryForMap("select void_reason,voided_at,voided_by_user_id from sales where id=?", f.sale());
        assertEquals("Synthetic VENTAS-RD-0A", audit.get("void_reason"));
        assertNotNull(audit.get("voided_at"));
        assertEquals(jdbc.queryForObject("select u.id from users u join sales s on s.created_by=u.username where s.id=?",
                UUID.class, f.sale()), audit.get("voided_by_user_id"));
        assertEquals(new BigDecimal("10.000"), stock(f));
        assertEquals(1, voidMovements(f));
        var after = state(f);
        assertEquals(409, voidSale(f).getResponse().getStatus());
        assertEquals(after, state(f));
        closeCash(f.token(), f.cash(), new BigDecimal("25.00"), "RD0 after void");
        assertEquals(new BigDecimal("25.00"), jdbc.queryForObject(
                "select expected_cash_amount from cash_register_sessions where id=?", BigDecimal.class, f.cash()));
        assertEquals(payments, payments(f.sale()));
    }

    @Test
    void rollbackAfterVoidWasPersistedRestoresEveryCommercialRecord() throws Exception {
        var f = fixture();
        var before = state(f);
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            try {
                assertEquals(200, voidSale(f).getResponse().getStatus());
                entityManager.flush();
                assertEquals("VOIDED", jdbc.queryForObject("select status from sales where id=?", String.class, f.sale()));
                assertEquals(1, voidMovements(f));
                assertEquals(before.get("payments"), payments(f.sale()));
                tx.setRollbackOnly();
            } catch (Exception e) { throw new AssertionError(e); }
        });
        assertEquals(before, state(f));
    }

    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "GENERATED", "SIGNED", "SENT", "ACCEPTED"})
    void fiscalBlocksLeaveHistoricalRowsAndCommercialEffectsUntouched(String fiscalStatus) throws Exception {
        var f = fixture();
        long series = jdbc.queryForObject("""
                insert into billing_series(document_type,series,current_number,environment,active,created_by,updated_by)
                values('RECEIPT',?,1,'LOCAL',false,'RD0','RD0') returning id
                """, Long.class, "R" + UUID.randomUUID().toString().substring(0, 7));
        jdbc.update("""
                insert into electronic_documents(sale_id,billing_series_id,document_type,status,environment,series,
                    number,full_number,subtotal_amount,tax_amount,total_amount,created_by,updated_by)
                values(?,?,'RECEIPT',?,'LOCAL','RD0',1,?,100,0,100,'RD0','RD0')
                """, f.sale(), series, fiscalStatus, "RD0-" + f.sale());
        var before = state(f);
        assertEquals(409, voidSale(f).getResponse().getStatus());
        assertEquals(before, state(f));
    }

    @ParameterizedTest
    @ValueSource(strings = {"id", "saleId", "createdAt", "method", "amount", "reference", "remove", "add", "duplicate"})
    void existingSaleRejectsUnexpectedPaymentChangesBeforeMutatingAnything(String field) throws Exception {
        var f = fixture();
        var before = state(f);
        assertThrows(SalesConflictException.class, () -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            Sale sale = sales.findById(f.sale()).orElseThrow();
            var changed = new ArrayList<>(sale.payments());
            SalePayment p = changed.get(0);
            changed.set(0, new SalePayment(field.equals("id") ? Long.MAX_VALUE : p.id(),
                    field.equals("saleId") ? Long.MAX_VALUE : p.saleId(),
                    field.equals("method") ? (p.paymentMethod() == PaymentMethod.CASH ? PaymentMethod.CARD : PaymentMethod.CASH) : p.paymentMethod(),
                    field.equals("amount") ? p.amount().add(BigDecimal.ONE) : p.amount(),
                    field.equals("reference") ? "altered" : p.reference(),
                    field.equals("createdAt") ? p.createdAt().plusSeconds(1) : p.createdAt()));
            if (field.equals("remove")) changed.remove(0);
            if (field.equals("add")) changed.add(new SalePayment(null, sale.id(), PaymentMethod.CASH, BigDecimal.ONE, null, null));
            if (field.equals("duplicate")) changed.set(1, changed.get(0));
            // Catch inside the transaction too: even an accidentally swallowed rejection must not dirty the header/items.
            assertThrows(SalesConflictException.class, () -> sales.save(withPayments(sale, changed)));
            assertEquals(before, state(f));
            sales.save(withPayments(sale, changed));
        }));
        assertEquals(before, state(f));
    }

    @Test
    void reorderingAnUnchangedPaymentSetDoesNotReplaceOrUpdateItsRows() throws Exception {
        var f = fixture();
        var before = payments(f.sale());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var sale = sales.findById(f.sale()).orElseThrow();
            var reordered = new ArrayList<>(sale.payments());
            Collections.reverse(reordered);
            sales.save(withPayments(sale, reordered));
        });
        assertEquals(before, payments(f.sale()));
    }

    private Fixture fixture() throws Exception {
        var token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        var suffix = "R0" + UUID.randomUUID().toString().replace("-", "").substring(0, 9);
        long category = createCategory(token, suffix), unit = createUnit(token, suffix);
        long warehouse = createWarehouse(token, suffix);
        long product = createProduct(token, category, unit, suffix, new BigDecimal("100.00"));
        registerInitialStock(token, product, warehouse, BigDecimal.TEN, "Synthetic RD0 stock");
        long cash = openCash(token, new BigDecimal("25.00"), suffix);
        var body = objectMapper.createObjectNode().put("warehouseId", warehouse);
        body.putArray("items").addObject().put("productId", product).put("quantity", 1).put("discountAmount", 0);
        var payments = body.putArray("payments");
        payments.addObject().put("paymentMethod", "CASH").put("amount", 50).putNull("reference");
        payments.addObject().put("paymentMethod", "CARD").put("amount", 40).put("reference", "RD0-card");
        payments.addObject().put("paymentMethod", "TRANSFER").put("amount", 20).put("reference", "RD0-transfer");
        confirmSalePayload(body);
        assertNull(prepareSaleFixture(token, body));
        var created = mockMvc.perform(post("/api/v1/sales").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isCreated()).andReturn();
        JsonNode sale = readJson(created);
        assertEquals(new BigDecimal("110.00"), sale.path("paidAmount").decimalValue().setScale(2));
        assertEquals(new BigDecimal("10.00"), sale.path("changeAmount").decimalValue().setScale(2));
        long id = sale.path("id").asLong();
        // Distinct, deliberately old timestamps make the regression independent of test execution speed.
        jdbc.update("update sale_payments set created_at=timestamptz '2020-01-02 03:04:05.123456+00' + id * interval '1 second' where sale_id=?", id);
        return new Fixture(token, id, cash, product, warehouse);
    }

    private MvcResult voidSale(Fixture f) throws Exception {
        return mockMvc.perform(post("/api/v1/sales/{id}/void", f.sale()).header(HttpHeaders.AUTHORIZATION, bearer(f.token()))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Synthetic VENTAS-RD-0A\"}")).andReturn();
    }

    private List<Map<String, Object>> payments(long sale) {
        return jdbc.queryForList("select id,sale_id,created_at,payment_method,amount,reference,xmin::text as row_version from sale_payments where sale_id=? order by id", sale);
    }

    private Map<String, Object> amounts(long sale) {
        return jdbc.queryForMap("select subtotal_amount,discount_amount,total_amount,paid_amount,change_amount from sales where id=?", sale);
    }

    private BigDecimal stock(Fixture f) {
        return jdbc.queryForObject("select quantity from stock_balances where product_id=? and warehouse_id=?", BigDecimal.class, f.product(), f.warehouse());
    }

    private int voidMovements(Fixture f) {
        return jdbc.queryForObject("select count(*) from inventory_movements where product_id=? and warehouse_id=? and movement_type='SALE_VOID_IN'", Integer.class, f.product(), f.warehouse());
    }

    private Map<String, Object> state(Fixture f) {
        return Map.of("payments", payments(f.sale()), "sale", jdbc.queryForMap("select * from sales where id=?", f.sale()),
                "items", jdbc.queryForList("select * from sale_items where sale_id=? order by id", f.sale()),
                "stock", stock(f), "voidMovements", voidMovements(f),
                "cash", jdbc.queryForMap("select * from cash_register_sessions where id=?", f.cash()));
    }

    private Sale withPayments(Sale s, List<SalePayment> payments) {
        return new Sale(s.id(), s.cashRegisterSessionId(), s.warehouseId(), s.saleNumber(), s.status(),
                s.subtotalAmount(), s.discountAmount(), s.totalAmount(), s.paidAmount(), s.changeAmount(),
                s.soldAt(), s.voidedAt(), s.voidedByUserId(), s.voidReason(), s.createdBy(), s.createdAt(), s.updatedAt(), s.items(), payments);
    }
}
