package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    void shouldUpdateWarehouseThroughHttpApi() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long warehouseId = createWarehouse(adminToken, Long.toString(System.nanoTime()));

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("code", "WIT-UPDATED");
        payload.put("name", "Warehouse Updated");

        mockMvc.perform(put("/api/v1/warehouses/{id}", warehouseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("WIT-UPDATED"))
                .andExpect(jsonPath("$.name").value("Warehouse Updated"));
    }

    @Test
    void shouldReturn409ForDuplicatedWarehouseCodeOnUpdate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long firstWarehouseId = createWarehouse(adminToken, Long.toString(System.nanoTime()));
        String suffix = Long.toString(System.nanoTime());
        long secondWarehouseId = createWarehouse(adminToken, suffix);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("code", "WIT" + suffix);
        payload.put("name", "Warehouse Updated");

        mockMvc.perform(put("/api/v1/warehouses/{id}", firstWarehouseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isConflict());

        mockMvc.perform(put("/api/v1/warehouses/{id}", secondWarehouseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }

    @Test
    void shouldReturn404ForMissingWarehouseUpdate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("code", "WIT-MISSING");
        payload.put("name", "Warehouse Missing");

        mockMvc.perform(put("/api/v1/warehouses/{id}", 999999L)
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
