package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductFiltersIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldFilterProductsWithPaginationThroughListEndpoint() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());

        long categoryA = createCategory(adminToken, suffix + "-A");
        long categoryB = createCategory(adminToken, suffix + "-B");
        long unitId = createUnit(adminToken, suffix);

        long withBarcode = createProduct(adminToken, categoryA, unitId, "SKU-A-" + suffix, "BC-A-" + suffix, "Mochila Azul " + suffix, BigDecimal.valueOf(12));
        long withoutBarcode = createProduct(adminToken, categoryA, unitId, "SKU-B-" + suffix, null, "Mochila Roja " + suffix, BigDecimal.valueOf(13));
        long inactive = createProduct(adminToken, categoryB, unitId, "SKU-C-" + suffix, "BC-C-" + suffix, "Plumones " + suffix, BigDecimal.valueOf(14));
        deactivateProduct(adminToken, inactive, categoryB, unitId, "SKU-C-" + suffix, "BC-C-" + suffix, "Plumones " + suffix, BigDecimal.valueOf(14));

        mockMvc.perform(get("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        mockMvc.perform(get("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("page", "0")
                        .param("size", "10")
                        .param("q", "Mochila")
                        .param("categoryId", String.valueOf(categoryA))
                        .param("active", "true")
                        .param("barcodeStatus", "WITHOUT_BARCODE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(withoutBarcode));

        mockMvc.perform(get("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("page", "0")
                        .param("size", "10")
                        .param("categoryId", String.valueOf(categoryA))
                        .param("barcodeStatus", "WITH_BARCODE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(withBarcode));

        mockMvc.perform(get("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("page", "0")
                        .param("size", "10")
                        .param("categoryId", String.valueOf(categoryB))
                        .param("active", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(inactive));
    }

    private long createProduct(String token, long categoryId, long unitId, String sku, String barcode, String name, BigDecimal salePrice) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sku", sku);
        if (barcode == null) {
            payload.putNull("barcode");
        } else {
            payload.put("barcode", barcode);
        }
        payload.put("name", name);
        payload.put("description", "Producto IT filtros");
        payload.put("categoryId", categoryId);
        payload.put("unitId", unitId);
        payload.put("salePrice", salePrice);

        MvcResult result = mockMvc.perform(post("/api/v1/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    private void deactivateProduct(String token, long productId, long categoryId, long unitId, String sku, String barcode, String name, BigDecimal salePrice) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sku", sku);
        payload.put("barcode", barcode);
        payload.put("name", name);
        payload.put("description", "Producto IT filtros");
        payload.put("categoryId", categoryId);
        payload.put("unitId", unitId);
        payload.put("salePrice", salePrice);
        payload.put("active", false);

        mockMvc.perform(put("/api/v1/products/{id}", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }
}
