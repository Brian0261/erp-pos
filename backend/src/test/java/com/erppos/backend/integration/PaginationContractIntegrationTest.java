package com.erppos.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PaginationContractIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldExposeStablePaginationContractInProductsV2AndKeepV1LegacyContract() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());

        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        createProduct(adminToken, categoryId, unitId, suffix, new BigDecimal("12.50"));

        mockMvc.perform(get("/api/v2/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.totalItems").exists())
                .andExpect(jsonPath("$.totalPages").exists())
                .andExpect(jsonPath("$.page").exists())
                .andExpect(jsonPath("$.size").exists())
                .andExpect(jsonPath("$.content").doesNotExist());

        mockMvc.perform(get("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void shouldExposeStablePaginationContractInInventoryStocksV2AndKeepV1LegacyContract() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());

        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, new BigDecimal("22.00"));
        registerInitialStock(adminToken, productId, warehouseId, new BigDecimal("3.00"), "BT-006 v2 stock");

        mockMvc.perform(get("/api/v2/inventory/stocks")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("productId", String.valueOf(productId))
                        .param("warehouseId", String.valueOf(warehouseId))
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.totalItems").exists())
                .andExpect(jsonPath("$.totalPages").exists())
                .andExpect(jsonPath("$.page").exists())
                .andExpect(jsonPath("$.size").exists())
                .andExpect(jsonPath("$.content").doesNotExist());

        mockMvc.perform(get("/api/v1/inventory/stocks")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("productId", String.valueOf(productId))
                        .param("warehouseId", String.valueOf(warehouseId))
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}

