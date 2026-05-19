package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductCleanupPreviewIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldForbidNonAdminPreview() throws Exception {
        String cajeroToken = login(CAJERO_EMAIL, CAJERO_PASSWORD);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(cajeroToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(999999L).toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldPreviewInactiveProductWithoutReferences() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.valueOf(7.50));
        deactivateProduct(adminToken, productId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(productId).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purgeable").value(true))
                .andExpect(jsonPath("$.summary.foundProducts").value(1))
                .andExpect(jsonPath("$.summary.relatedSales").value(0))
                .andExpect(jsonPath("$.foundProducts[0].active").value(false))
                .andExpect(jsonPath("$.foundProducts[0].purgeCandidate").value(true));
    }

    @Test
    void shouldPreviewMixedSaleAndKeepDataUnchanged() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long targetProductId = createProduct(adminToken, categoryId, unitId, "A-" + suffix, BigDecimal.TEN);
        long otherProductId = createProduct(adminToken, categoryId, unitId, "B-" + suffix, BigDecimal.valueOf(5));
        registerInitialStock(adminToken, targetProductId, warehouseId, BigDecimal.TEN, "IT target");
        registerInitialStock(adminToken, otherProductId, warehouseId, BigDecimal.TEN, "IT other");
        openCash(adminToken, BigDecimal.valueOf(100), suffix);
        createSale(adminToken, warehouseId, new long[]{targetProductId, otherProductId}, new BigDecimal[]{BigDecimal.ONE, BigDecimal.ONE}, BigDecimal.valueOf(15));
        deactivateProduct(adminToken, targetProductId);

        Counts before = snapshotCounts();

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(targetProductId).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.relatedSales").value(1))
                .andExpect(jsonPath("$.summary.mixedSales").value(1))
                .andExpect(jsonPath("$.purgeable").value(false))
                .andExpect(jsonPath("$.relatedSales[0].mixedSale").value(true))
                .andExpect(jsonPath("$.relatedSaleItems.length()").value(2));

        assertEquals(before, snapshotCounts());
    }

    @Test
    void shouldBlockWhenElectronicDocumentExists() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        registerInitialStock(adminToken, productId, warehouseId, BigDecimal.TEN, "IT doc");
        openCash(adminToken, BigDecimal.valueOf(50), suffix);
        long saleId = createSale(adminToken, warehouseId, new long[]{productId}, new BigDecimal[]{BigDecimal.ONE}, BigDecimal.TEN);
        deactivateProduct(adminToken, productId);
        insertElectronicDocument(saleId, productId, suffix);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(productId).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.relatedDocuments").value(1))
                .andExpect(jsonPath("$.purgeable").value(false))
                .andExpect(jsonPath("$.electronicDocumentItems[0].saleId").value(saleId))
                .andExpect(jsonPath("$.blockers[0]").exists());
    }

    private ObjectNode previewPayload(long productId) {
        ObjectNode payload = objectMapper.createObjectNode();
        ArrayNode ids = payload.putArray("productIds");
        ids.add(productId);
        return payload;
    }

    private void deactivateProduct(String token, long productId) throws Exception {
        mockMvc.perform(delete("/api/v1/products/{id}", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }

    private long createSale(String token, long warehouseId, long[] productIds, BigDecimal[] quantities, BigDecimal paymentAmount) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("warehouseId", warehouseId);
        ArrayNode items = payload.putArray("items");
        for (int index = 0; index < productIds.length; index++) {
            ObjectNode item = items.addObject();
            item.put("productId", productIds[index]);
            item.put("quantity", quantities[index]);
            item.put("discountAmount", BigDecimal.ZERO);
        }
        ObjectNode payment = payload.putArray("payments").addObject();
        payment.put("paymentMethod", "CASH");
        payment.put("amount", paymentAmount);
        payment.put("reference", "PREVIEW-QA");

        MvcResult result = mockMvc.perform(post("/api/v1/sales")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    private void insertElectronicDocument(long saleId, long productId, String suffix) {
        Long seriesId = jdbcTemplate.queryForObject(
                """
                        insert into billing_series (document_type, series, current_number, environment, active, created_by, updated_by)
                        values ('RECEIPT', ?, 1, 'LOCAL', true, 'it-cleanup', 'it-cleanup')
                        returning id
                        """,
                Long.class,
                "B" + suffix.substring(Math.max(0, suffix.length() - 6))
        );

        Long documentId = jdbcTemplate.queryForObject(
                """
                        insert into electronic_documents (
                            sale_id, billing_series_id, document_type, status, environment, series, number, full_number,
                            customer_name, customer_document, currency_code, subtotal_amount, tax_amount, total_amount,
                            created_by, updated_by
                        ) values (?, ?, 'RECEIPT', 'GENERATED', 'LOCAL', 'B001', 1, ?, 'CLIENTE QA', '00000000', 'PEN', 10, 0, 10, 'it-cleanup', 'it-cleanup')
                        returning id
                        """,
                Long.class,
                saleId,
                seriesId,
                "B001-" + suffix.substring(Math.max(0, suffix.length() - 8))
        );

        jdbcTemplate.update(
                """
                        insert into electronic_document_items (electronic_document_id, product_id, description, quantity, unit_price, discount_amount, line_total)
                        values (?, ?, ?, 1, 10, 0, 10)
                        """,
                documentId,
                productId,
                "Producto cleanup " + suffix
        );
    }

    private Counts snapshotCounts() {
        return new Counts(
                count("products"),
                count("sales"),
                count("sale_items"),
                count("sale_payments"),
                count("inventory_movements"),
                count("electronic_documents"),
                count("electronic_document_items")
        );
    }

    private long count(String table) {
        Long value = jdbcTemplate.queryForObject("select count(*) from " + table, Long.class);
        return value == null ? 0L : value;
    }

    private record Counts(
            long products,
            long sales,
            long saleItems,
            long salePayments,
            long inventoryMovements,
            long electronicDocuments,
            long electronicDocumentItems
    ) {
    }
}
