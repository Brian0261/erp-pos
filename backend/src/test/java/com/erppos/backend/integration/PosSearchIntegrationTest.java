package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PosSearchIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldSearchPosProductsByMultipleTokensAndKeepStockZeroResults() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());

        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);

        String marker = suffix.substring(suffix.length() - 6);

        long stockedProductId = createPosProduct(adminToken, categoryId, unitId,
                "SKU-POS-A-" + suffix,
                "BC-POS-A-" + suffix,
                "TEMPERA CAJA X7 C/PINCEL DAVID " + marker,
                new BigDecimal("17.50"));
        registerInitialStock(adminToken, stockedProductId, warehouseId, new BigDecimal("6.00"), "POS seed stock");

        long zeroStockProductId = createPosProduct(adminToken, categoryId, unitId,
                "SKU-POS-B-" + suffix,
                "BC-POS-B-" + suffix,
                "CAJA DAVID SIN STOCK " + marker,
                new BigDecimal("11.00"));

        mockMvc.perform(get("/api/v1/pos/products/search")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("q", "caja david " + marker)
                        .param("warehouseId", String.valueOf(warehouseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].productId").value(stockedProductId))
                .andExpect(jsonPath("$[0].sku").value("SKU-POS-A-" + suffix))
                .andExpect(jsonPath("$[0].salePrice").value(17.50))
                .andExpect(jsonPath("$[0].stockAvailable").value(6.00))
                .andExpect(jsonPath("$[1].productId").value(zeroStockProductId))
                .andExpect(jsonPath("$[1].stockAvailable").value(0));

        mockMvc.perform(get("/api/v1/pos/products/search")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("q", "david caja " + marker)
                        .param("warehouseId", String.valueOf(warehouseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].productId").value(stockedProductId))
                .andExpect(jsonPath("$[1].productId").value(zeroStockProductId));
    }

    @Test
    void shouldKeepExactPosLookupBySkuAndBarcodeIntact() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());

        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);

        long productId = createPosProduct(adminToken, categoryId, unitId,
                "SKU-POS-EXACT-" + suffix,
                "BC-POS-EXACT-" + suffix,
                "LAPICERO ROJO " + suffix,
                new BigDecimal("5.25"));
        registerInitialStock(adminToken, productId, warehouseId, new BigDecimal("3.00"), "POS exact stock");

        mockMvc.perform(get("/api/v1/pos/products/lookup")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("code", "SKU-POS-EXACT-" + suffix)
                        .param("warehouseId", String.valueOf(warehouseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value(productId))
                .andExpect(jsonPath("$.salePrice").value(5.25))
                .andExpect(jsonPath("$.stockAvailable").value(3.00));

        mockMvc.perform(get("/api/v1/pos/products/lookup")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("code", "BC-POS-EXACT-" + suffix)
                        .param("warehouseId", String.valueOf(warehouseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value(productId));
    }

    private long createPosProduct(String token, long categoryId, long unitId, String sku, String barcode, String name, BigDecimal salePrice) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sku", sku);
        payload.put("barcode", barcode);
        payload.put("name", name);
        payload.put("description", "Producto POS IT");
        payload.put("categoryId", categoryId);
        payload.put("unitId", unitId);
        payload.put("salePrice", salePrice);

        var result = mockMvc.perform(post("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }
}
