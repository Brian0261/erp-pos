package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BtRulesIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldEnforceBt001SingleOpenCashAndAllowReopenAfterClose() throws Exception {
        String cajeroToken = login(CAJERO_EMAIL, CAJERO_PASSWORD);
        ensureNoOpenCash(cajeroToken);

        long firstSessionId = openCash(cajeroToken, BigDecimal.ZERO, "bt001-first");

        MvcResult secondOpen = mockMvc.perform(post("/api/v1/cash-registers/open")
                        .header(HttpHeaders.AUTHORIZATION, bearer(cajeroToken))
                        .contentType("application/json")
                        .content("{\"openingAmount\":0,\"notes\":\"bt001-second\"}"))
                .andExpect(status().isConflict())
                .andReturn();

        assertTrue(secondOpen.getResponse().getStatus() != 500);

        closeCash(cajeroToken, firstSessionId, BigDecimal.ZERO, "bt001-close");
        long reopenedSessionId = openCash(cajeroToken, BigDecimal.ZERO, "bt001-reopen");
        assertTrue(reopenedSessionId > firstSessionId);

        closeCash(cajeroToken, reopenedSessionId, BigDecimal.ZERO, "bt001-close-reopen");
    }

    @Test
    void shouldEnforceBt003SingleInitialStockPerProductWarehouse() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());

        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, new BigDecimal("15.00"));

        registerInitialStock(adminToken, productId, warehouseId, new BigDecimal("7.00"), "BT-003 first stock");

        MvcResult secondInitialStock = mockMvc.perform(post("/api/v1/inventory/initial-stock")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType("application/json")
                        .content("{\"productId\":" + productId + ",\"warehouseId\":" + warehouseId + ",\"quantity\":3,\"reason\":\"BT-003 second stock\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andReturn();

        assertTrue(secondInitialStock.getResponse().getStatus() != 500);

        MvcResult kardex = mockMvc.perform(get("/api/v1/inventory/kardex")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("productId", String.valueOf(productId))
                        .param("warehouseId", String.valueOf(warehouseId)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode movements = readJson(kardex);
        int initialStockCount = 0;
        for (JsonNode movement : movements) {
            if ("INITIAL_STOCK".equals(movement.path("movementType").asText())) {
                initialStockCount++;
            }
        }
        assertEquals(1, initialStockCount);

        MvcResult stocks = mockMvc.perform(get("/api/v1/inventory/stocks")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("productId", String.valueOf(productId))
                        .param("warehouseId", String.valueOf(warehouseId)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode stockBody = readJson(stocks);
        BigDecimal currentQty = new BigDecimal(stockBody.path("content").get(0).path("quantity").asText());
        assertEquals(0, currentQty.compareTo(new BigDecimal("7.00")));
    }

    @Test
    void shouldEnforceBt002SingleQuoteConversion() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        ensureNoOpenCash(adminToken);
        String suffix = Long.toString(System.nanoTime());

        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long warehouseId = createWarehouse(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, new BigDecimal("20.00"));

        registerInitialStock(adminToken, productId, warehouseId, new BigDecimal("10.00"), "BT-002 seed stock");

        long cashId = openCash(adminToken, BigDecimal.ZERO, "bt002-cash");
        long quoteId = createQuote(adminToken, productId, new BigDecimal("1.00"), LocalDate.now().plusDays(2), suffix);

        MvcResult firstConversion = convertQuoteToSale(adminToken, quoteId, warehouseId, new BigDecimal("20.00"), suffix + "-1");
        assertEquals(200, firstConversion.getResponse().getStatus());
        JsonNode converted = readJson(firstConversion);
        assertTrue(converted.path("convertedSaleId").asLong() > 0);

        MvcResult secondConversion = convertQuoteToSale(adminToken, quoteId, warehouseId, new BigDecimal("20.00"), suffix + "-2");
        assertEquals(409, secondConversion.getResponse().getStatus());
        assertTrue(secondConversion.getResponse().getStatus() != 500);

        closeCash(adminToken, cashId, BigDecimal.ZERO, "bt002-cash-close");
    }
}


