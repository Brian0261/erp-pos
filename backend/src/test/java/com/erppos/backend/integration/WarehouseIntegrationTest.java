package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WarehouseIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldChangeWarehouseStatusThroughHttpApi() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long warehouseId = createWarehouse(adminToken, Long.toString(System.nanoTime()));

        ObjectNode deactivatePayload = objectMapper.createObjectNode();
        deactivatePayload.put("active", false);

        mockMvc.perform(patch("/api/v1/warehouses/{id}/status", warehouseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(deactivatePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        ObjectNode reactivatePayload = objectMapper.createObjectNode();
        reactivatePayload.put("active", true);

        mockMvc.perform(patch("/api/v1/warehouses/{id}/status", warehouseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reactivatePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void shouldReturn404ForMissingWarehouseStatusChange() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("active", false);

        mockMvc.perform(patch("/api/v1/warehouses/{id}/status", 999999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldKeepDeleteDeactivatingWarehouse() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long warehouseId = createWarehouse(adminToken, Long.toString(System.nanoTime()));

        mockMvc.perform(delete("/api/v1/warehouses/{id}", warehouseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/warehouses/{id}", warehouseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }
}
