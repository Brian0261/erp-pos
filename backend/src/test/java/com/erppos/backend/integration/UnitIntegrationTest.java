package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UnitIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldUpdateAndToggleUnitThroughHttpApi() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long unitId = createUnit(adminToken, "-UNIT");

        ObjectNode updatePayload = objectMapper.createObjectNode();
        updatePayload.put("code", "U-UNIT");
        updatePayload.put("name", "Unidad prueba");

        mockMvc.perform(put("/api/v1/units/{id}", unitId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("U-UNIT"));

        ObjectNode statusPayload = objectMapper.createObjectNode();
        statusPayload.put("active", false);

        mockMvc.perform(patch("/api/v1/units/{id}/status", unitId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusPayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/v1/units")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").exists());
    }

    @Test
    void shouldRejectDuplicateCodeOnUpdate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long firstId = createUnit(adminToken, "-A");
        long secondId = createUnit(adminToken, "-B");

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("code", "UIT-A");
        payload.put("name", "Unidad duplicada");

        mockMvc.perform(put("/api/v1/units/{id}", secondId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isConflict());
    }
}
