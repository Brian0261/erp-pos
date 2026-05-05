package com.erppos.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReportsHardeningIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldReturnSalesWithoutDatesUsingSafeDefaultRange() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(get("/api/v1/reports/sales")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSalesCount").exists());
    }

    @Test
    void shouldRejectExcessiveRangeAndInvalidDateOrderWith422() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(get("/api/v1/reports/sales")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("from", "2026-01-01")
                        .param("to", "2026-05-01"))
                .andExpect(status().isUnprocessableEntity());

        mockMvc.perform(get("/api/v1/reports/inventory-movements")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("from", "2026-05-10")
                        .param("to", "2026-05-01"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void shouldApplyLowStockLimitValidationAndSupportDefaultLimit() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        MvcResult lowStockDefault = mockMvc.perform(get("/api/v1/reports/low-stock")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("threshold", "999999"))
                .andExpect(status().isOk())
                .andReturn();

        assertTrue(readJson(lowStockDefault).isArray());

        mockMvc.perform(get("/api/v1/reports/low-stock")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("threshold", "10")
                        .param("limit", "1001"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void shouldApplyInventoryMovementsDefaultAndExplicitLimit() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());

        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);

        long productIdA = createProduct(adminToken, categoryId, unitId, suffix + "A", new BigDecimal("10.00"));
        long productIdB = createProduct(adminToken, categoryId, unitId, suffix + "B", new BigDecimal("12.00"));

        registerInitialStock(adminToken, productIdA, warehouseId, new BigDecimal("1.00"), "BT-007 report movement A");
        registerInitialStock(adminToken, productIdB, warehouseId, new BigDecimal("1.00"), "BT-007 report movement B");

        MvcResult defaultMovements = mockMvc.perform(get("/api/v1/reports/inventory-movements")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andReturn();

        assertTrue(readJson(defaultMovements).isArray());

        MvcResult limitedMovements = mockMvc.perform(get("/api/v1/reports/inventory-movements")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andReturn();

        assertTrue(readJson(limitedMovements).size() <= 1);

        mockMvc.perform(get("/api/v1/reports/inventory-movements")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("limit", "2001"))
                .andExpect(status().isUnprocessableEntity());
    }
}

