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
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    void shouldForbidNonAdminExecute() throws Exception {
        String cajeroToken = login(CAJERO_EMAIL, CAJERO_PASSWORD);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(cajeroToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(999999L, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isForbidden());
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

    @Test
    void shouldPreviewPurePurchaseOrderAsWarning() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        long purchaseOrderId = createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{productId}, new BigDecimal[]{BigDecimal.valueOf(3)}, new BigDecimal[]{BigDecimal.TEN}).orderId();
        deactivateProduct(adminToken, productId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(productId).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purgeable").value(true))
                .andExpect(jsonPath("$.summary.relatedPurchaseOrders").value(1))
                .andExpect(jsonPath("$.summary.purePurchaseOrders").value(1))
                .andExpect(jsonPath("$.summary.mixedPurchaseOrders").value(0))
                .andExpect(jsonPath("$.purchaseOrders[0].purchaseOrderId").value(purchaseOrderId))
                .andExpect(jsonPath("$.purchaseOrders[0].purePurchaseOrder").value(true))
                .andExpect(jsonPath("$.warnings[0]").exists());
    }

    @Test
    void shouldPreviewPurePurchaseReceiptAsWarning() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        PurchaseOrderData order = createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{productId}, new BigDecimal[]{BigDecimal.valueOf(4)}, new BigDecimal[]{BigDecimal.TEN});
        approvePurchaseOrder(adminToken, order.orderId());
        receivePurchaseOrder(adminToken, order.orderId(), new long[]{order.itemIds()[0]}, new BigDecimal[]{BigDecimal.valueOf(4)});
        long purchaseReceiptId = latestPurchaseReceiptId(order.orderId());
        deactivateProduct(adminToken, productId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(productId).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purgeable").value(true))
                .andExpect(jsonPath("$.summary.purePurchaseOrders").value(1))
                .andExpect(jsonPath("$.summary.purePurchaseReceipts").value(1))
                .andExpect(jsonPath("$.purchaseReceipts[0].purchaseReceiptId").value(purchaseReceiptId))
                .andExpect(jsonPath("$.purchaseReceipts[0].purePurchaseReceipt").value(true));
    }

    @Test
    void shouldPreviewMixedPurchaseOrderAsBlocker() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long targetProductId = createProduct(adminToken, categoryId, unitId, "A-" + suffix, BigDecimal.TEN);
        long otherProductId = createProduct(adminToken, categoryId, unitId, "B-" + suffix, BigDecimal.valueOf(5));
        createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{targetProductId, otherProductId}, new BigDecimal[]{BigDecimal.ONE, BigDecimal.ONE}, new BigDecimal[]{BigDecimal.TEN, BigDecimal.valueOf(5)});
        deactivateProduct(adminToken, targetProductId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(targetProductId).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purgeable").value(false))
                .andExpect(jsonPath("$.summary.mixedPurchaseOrders").value(1))
                .andExpect(jsonPath("$.purchaseOrders[0].mixedPurchaseOrder").value(true))
                .andExpect(jsonPath("$.blockers[0]").value(org.hamcrest.Matchers.containsString("mixed purchase order")));
    }

    @Test
    void shouldPreviewMixedPurchaseReceiptAsBlocker() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long targetProductId = createProduct(adminToken, categoryId, unitId, "A-" + suffix, BigDecimal.TEN);
        long otherProductId = createProduct(adminToken, categoryId, unitId, "B-" + suffix, BigDecimal.valueOf(5));
        PurchaseOrderData order = createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{targetProductId, otherProductId}, new BigDecimal[]{BigDecimal.valueOf(2), BigDecimal.ONE}, new BigDecimal[]{BigDecimal.TEN, BigDecimal.valueOf(5)});
        approvePurchaseOrder(adminToken, order.orderId());
        receivePurchaseOrder(adminToken, order.orderId(), new long[]{order.itemIds()[0]}, new BigDecimal[]{BigDecimal.ONE});
        deactivateProduct(adminToken, targetProductId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/preview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(targetProductId).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purgeable").value(false))
                .andExpect(jsonPath("$.summary.mixedPurchaseReceipts").value(1))
                .andExpect(jsonPath("$.purchaseReceipts[0].mixedPurchaseReceipt").value(true));
    }

    @Test
    void shouldExecuteInactiveProductWithoutReferences() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.valueOf(9.99));
        deactivateProduct(adminToken, productId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(productId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deletedProductIds[0]").value(productId))
                .andExpect(jsonPath("$.deletedProducts").value(1))
                .andExpect(jsonPath("$.deletedSales").value(0))
                .andExpect(jsonPath("$.deletedSaleItems").value(0))
                .andExpect(jsonPath("$.deletedSalePayments").value(0));

        Long remaining = jdbcTemplate.queryForObject("select count(*) from products where id = ?", Long.class, productId);
        assertEquals(0L, remaining == null ? 0L : remaining);
    }

    @Test
    void shouldRejectExecuteForActiveProduct() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.valueOf(9.99));

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(productId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").exists());

        Long remaining = jdbcTemplate.queryForObject("select count(*) from products where id = ?", Long.class, productId);
        assertTrue(remaining != null && remaining == 1L);
    }

    @Test
    void shouldRejectExecuteWhenConfirmationTextIsInvalidAndKeepDataUnchanged() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.valueOf(9.99));
        deactivateProduct(adminToken, productId);

        Counts before = snapshotCounts();

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(productId, "BORRAR").toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("confirmationText must be exactly ELIMINAR PRUEBAS"));

        assertEquals(before, snapshotCounts());
        assertEquals(1L, countById("products", productId));
    }

    @Test
    void shouldExecutePurePurchaseOrderAndDeleteWholeChain() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        long controlProductId = createProduct(adminToken, categoryId, unitId, "CTRL-" + suffix, BigDecimal.valueOf(4));
        PurchaseOrderData order = createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{productId}, new BigDecimal[]{BigDecimal.valueOf(3)}, new BigDecimal[]{BigDecimal.TEN});
        deactivateProduct(adminToken, productId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(productId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deletedPurchaseOrderIds[0]").value(order.orderId()))
                .andExpect(jsonPath("$.deletedPurchaseOrders").value(1))
                .andExpect(jsonPath("$.deletedPurchaseOrderItems").value(1))
                .andExpect(jsonPath("$.deletedPurchaseReceipts").value(0));

        assertEquals(0L, countById("products", productId));
        assertEquals(0L, countById("purchase_orders", order.orderId()));
        assertEquals(0L, countByColumn("purchase_order_items", "purchase_order_id", order.orderId()));
        assertEquals(1L, countById("products", controlProductId));
    }

    @Test
    void shouldExecutePurePurchaseReceiptAndDeleteWholeChain() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        PurchaseOrderData order = createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{productId}, new BigDecimal[]{BigDecimal.valueOf(5)}, new BigDecimal[]{BigDecimal.TEN});
        approvePurchaseOrder(adminToken, order.orderId());
        receivePurchaseOrder(adminToken, order.orderId(), new long[]{order.itemIds()[0]}, new BigDecimal[]{BigDecimal.valueOf(5)});
        long purchaseReceiptId = latestPurchaseReceiptId(order.orderId());
        deactivateProduct(adminToken, productId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(productId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deletedPurchaseOrderIds[0]").value(order.orderId()))
                .andExpect(jsonPath("$.deletedPurchaseReceiptIds[0]").value(purchaseReceiptId))
                .andExpect(jsonPath("$.deletedPurchaseOrders").value(1))
                .andExpect(jsonPath("$.deletedPurchaseReceipts").value(1));

        assertEquals(0L, countById("products", productId));
        assertEquals(0L, countById("purchase_orders", order.orderId()));
        assertEquals(0L, countById("purchase_receipts", purchaseReceiptId));
        assertEquals(0L, countByColumn("purchase_receipt_items", "purchase_receipt_id", purchaseReceiptId));
        assertEquals(0L, countByColumn("inventory_movements", "product_id", productId));
        assertEquals(0L, countByColumn("stock_balances", "product_id", productId));
    }

    @Test
    void shouldRejectExecuteWhenConfirmationTextIsMissing() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewPayload(999999L).toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void shouldRejectExecuteForEmptyRequest() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("confirmationText", "ELIMINAR PRUEBAS");

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("At least one productId or sku is required"));
    }

    @Test
    void shouldRejectExecuteForMissingProductAndKeepDataUnchanged() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        Counts before = snapshotCounts();

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(999999L, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Some requested products were not found in the catalog. No matching products were found for the requested identifiers."));

        assertEquals(before, snapshotCounts());
    }

    @Test
    void shouldBlockExecuteForMixedSaleAndKeepDataUnchanged() throws Exception {
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

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(targetProductId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("mixed sale")));

        assertEquals(before, snapshotCounts());
        assertEquals(1L, countById("products", targetProductId));
        assertEquals(1L, countById("products", otherProductId));
    }

    @Test
    void shouldBlockExecuteForMixedPurchaseOrderAndKeepDataUnchanged() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long targetProductId = createProduct(adminToken, categoryId, unitId, "A-" + suffix, BigDecimal.TEN);
        long otherProductId = createProduct(adminToken, categoryId, unitId, "B-" + suffix, BigDecimal.valueOf(5));
        PurchaseOrderData order = createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{targetProductId, otherProductId}, new BigDecimal[]{BigDecimal.ONE, BigDecimal.ONE}, new BigDecimal[]{BigDecimal.TEN, BigDecimal.valueOf(5)});
        deactivateProduct(adminToken, targetProductId);

        Counts before = snapshotCounts();

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(targetProductId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("mixed purchase order")));

        assertEquals(before, snapshotCounts());
        assertEquals(1L, countById("products", targetProductId));
        assertEquals(1L, countById("products", otherProductId));
        assertEquals(1L, countById("purchase_orders", order.orderId()));
    }

    @Test
    void shouldBlockExecuteForMixedPurchaseReceiptAndKeepDataUnchanged() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long targetProductId = createProduct(adminToken, categoryId, unitId, "A-" + suffix, BigDecimal.TEN);
        long otherProductId = createProduct(adminToken, categoryId, unitId, "B-" + suffix, BigDecimal.valueOf(5));
        PurchaseOrderData order = createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{targetProductId, otherProductId}, new BigDecimal[]{BigDecimal.valueOf(2), BigDecimal.ONE}, new BigDecimal[]{BigDecimal.TEN, BigDecimal.valueOf(5)});
        approvePurchaseOrder(adminToken, order.orderId());
        receivePurchaseOrder(adminToken, order.orderId(), new long[]{order.itemIds()[0]}, new BigDecimal[]{BigDecimal.ONE});
        long purchaseReceiptId = latestPurchaseReceiptId(order.orderId());
        deactivateProduct(adminToken, targetProductId);

        Counts before = snapshotCounts();

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(targetProductId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("mixed purchase receipt")));

        assertEquals(before, snapshotCounts());
        assertEquals(1L, countById("products", targetProductId));
        assertEquals(1L, countById("purchase_receipts", purchaseReceiptId));
        assertEquals(1L, countById("products", otherProductId));
    }

    @Test
    void shouldBlockExecuteWhenElectronicDocumentExistsAndKeepDataUnchanged() throws Exception {
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

        Counts before = snapshotCounts();

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(productId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("electronic document")));

        assertEquals(before, snapshotCounts());
        assertEquals(1L, countById("products", productId));
        assertEquals(1L, countById("sales", saleId));
    }

    @Test
    void shouldExecutePureSaleAndDeleteRelatedRowsConsistently() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long supplierId = createSupplier(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        long controlProductId = createProduct(adminToken, categoryId, unitId, "CTRL-" + suffix, BigDecimal.valueOf(3));
        PurchaseOrderData order = createPurchaseOrder(adminToken, supplierId, warehouseId, new long[]{productId}, new BigDecimal[]{BigDecimal.valueOf(3)}, new BigDecimal[]{BigDecimal.TEN});
        approvePurchaseOrder(adminToken, order.orderId());
        receivePurchaseOrder(adminToken, order.orderId(), new long[]{order.itemIds()[0]}, new BigDecimal[]{BigDecimal.valueOf(3)});
        long purchaseReceiptId = latestPurchaseReceiptId(order.orderId());
        openCash(adminToken, BigDecimal.valueOf(50), suffix);
        long saleId = createSale(adminToken, warehouseId, new long[]{productId}, new BigDecimal[]{BigDecimal.ONE}, BigDecimal.TEN);
        deactivateProduct(adminToken, productId);

        long saleItemsBefore = countByColumn("sale_items", "sale_id", saleId);
        long salePaymentsBefore = countByColumn("sale_payments", "sale_id", saleId);
        long movementsBefore = countByColumn("inventory_movements", "product_id", productId);
        long balancesBefore = countByColumn("stock_balances", "product_id", productId);

        mockMvc.perform(post("/api/v1/admin/test-data-cleanup/products/execute")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(executePayload(productId, "ELIMINAR PRUEBAS").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deletedProductIds[0]").value(productId))
                .andExpect(jsonPath("$.deletedSaleIds[0]").value(saleId))
                .andExpect(jsonPath("$.deletedPurchaseOrderIds[0]").value(order.orderId()))
                .andExpect(jsonPath("$.deletedPurchaseReceiptIds[0]").value(purchaseReceiptId))
                .andExpect(jsonPath("$.deletedProducts").value(1))
                .andExpect(jsonPath("$.deletedSales").value(1))
                .andExpect(jsonPath("$.deletedSaleItems").value((int) saleItemsBefore))
                .andExpect(jsonPath("$.deletedSalePayments").value((int) salePaymentsBefore))
                .andExpect(jsonPath("$.deletedPurchaseOrders").value(1))
                .andExpect(jsonPath("$.deletedPurchaseReceipts").value(1));

        assertEquals(0L, countById("products", productId));
        assertEquals(0L, countById("sales", saleId));
        assertEquals(0L, countById("purchase_orders", order.orderId()));
        assertEquals(0L, countById("purchase_receipts", purchaseReceiptId));
        assertEquals(0L, countByColumn("sale_items", "sale_id", saleId));
        assertEquals(0L, countByColumn("sale_payments", "sale_id", saleId));
        assertEquals(0L, countByColumn("inventory_movements", "product_id", productId));
        assertEquals(0L, countByColumn("stock_balances", "product_id", productId));
        assertEquals(1L, countById("products", controlProductId));
        assertTrue(movementsBefore > 0);
        assertTrue(balancesBefore > 0);
    }

    private ObjectNode previewPayload(long productId) {
        ObjectNode payload = objectMapper.createObjectNode();
        ArrayNode ids = payload.putArray("productIds");
        ids.add(productId);
        return payload;
    }

    private ObjectNode executePayload(long productId, String confirmationText) {
        ObjectNode payload = previewPayload(productId);
        payload.put("confirmationText", confirmationText);
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

    private long createSupplier(String token, String suffix) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("documentNumber", "206" + suffix.substring(Math.max(0, suffix.length() - 8)));
        payload.put("name", "Proveedor QA " + suffix);

        MvcResult result = mockMvc.perform(post("/api/v1/suppliers")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    private PurchaseOrderData createPurchaseOrder(String token, long supplierId, long warehouseId, long[] productIds, BigDecimal[] quantities, BigDecimal[] unitCosts) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("supplierId", supplierId);
        payload.put("warehouseId", warehouseId);
        ArrayNode items = payload.putArray("items");
        for (int index = 0; index < productIds.length; index++) {
            ObjectNode item = items.addObject();
            item.put("productId", productIds[index]);
            item.put("quantityOrdered", quantities[index]);
            item.put("unitCost", unitCosts[index]);
        }

        MvcResult result = mockMvc.perform(post("/api/v1/purchase-orders")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        ObjectNode body = (ObjectNode) readJson(result);
        ArrayNode responseItems = (ArrayNode) body.path("items");
        long[] itemIds = new long[responseItems.size()];
        for (int index = 0; index < responseItems.size(); index++) {
            itemIds[index] = responseItems.get(index).path("id").asLong();
        }
        return new PurchaseOrderData(body.path("id").asLong(), itemIds);
    }

    private void approvePurchaseOrder(String token, long purchaseOrderId) throws Exception {
        mockMvc.perform(post("/api/v1/purchase-orders/{id}/approve", purchaseOrderId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
    }

    private void receivePurchaseOrder(String token, long purchaseOrderId, long[] purchaseOrderItemIds, BigDecimal[] quantities) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        ArrayNode items = payload.putArray("items");
        for (int index = 0; index < purchaseOrderItemIds.length; index++) {
            ObjectNode item = items.addObject();
            item.put("purchaseOrderItemId", purchaseOrderItemIds[index]);
            item.put("quantityReceived", quantities[index]);
        }

        mockMvc.perform(post("/api/v1/purchase-orders/{id}/receive", purchaseOrderId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }

    private long latestPurchaseReceiptId(long purchaseOrderId) {
        Long value = jdbcTemplate.queryForObject(
                "select max(id) from purchase_receipts where purchase_order_id = ?",
                Long.class,
                purchaseOrderId
        );
        return value == null ? 0L : value;
    }

    private void insertElectronicDocument(long saleId, long productId, String suffix) {
        Long seriesId = findOrCreateBillingSeries(suffix);

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

    private Long findOrCreateBillingSeries(String suffix) {
        List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "select id from billing_series where document_type = 'RECEIPT' and environment = 'LOCAL' and active = true"
        );
        if (existing != null && !existing.isEmpty()) {
            return ((Number) existing.get(0).get("id")).longValue();
        }
        return jdbcTemplate.queryForObject(
                """
                        insert into billing_series (document_type, series, current_number, environment, active, created_by, updated_by)
                        values ('RECEIPT', ?, 1, 'LOCAL', true, 'it-cleanup', 'it-cleanup')
                        returning id
                        """,
                Long.class,
                "B" + suffix.substring(Math.max(0, suffix.length() - 6))
        );
    }

    private Counts snapshotCounts() {
        return new Counts(
                count("products"),
                count("sales"),
                count("sale_items"),
                count("sale_payments"),
                count("purchase_orders"),
                count("purchase_order_items"),
                count("purchase_receipts"),
                count("purchase_receipt_items"),
                count("stock_balances"),
                count("inventory_movements"),
                count("electronic_documents"),
                count("electronic_document_items")
        );
    }

    private long count(String table) {
        Long value = jdbcTemplate.queryForObject("select count(*) from " + table, Long.class);
        return value == null ? 0L : value;
    }

    private long countById(String table, long id) {
        return countByColumn(table, "id", id);
    }

    private long countByColumn(String table, String column, long value) {
        Long count = jdbcTemplate.queryForObject("select count(*) from " + table + " where " + column + " = ?", Long.class, value);
        return count == null ? 0L : count;
    }

    private record Counts(
            long products,
            long sales,
            long saleItems,
            long salePayments,
            long purchaseOrders,
            long purchaseOrderItems,
            long purchaseReceipts,
            long purchaseReceiptItems,
            long stockBalances,
            long inventoryMovements,
            long electronicDocuments,
            long electronicDocumentItems
    ) {
    }

    private record PurchaseOrderData(long orderId, long[] itemIds) {
    }
}
