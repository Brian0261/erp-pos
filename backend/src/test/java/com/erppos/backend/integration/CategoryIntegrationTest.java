package com.erppos.backend.integration;

import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.domain.port.CategoryRepositoryPort;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CategoryIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private CategoryRepositoryPort categoryRepositoryPort;

    @Test
    void shouldUpdateAndToggleCategoryThroughHttpApi() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long categoryId = createCategory(adminToken, "-CAT");

        ObjectNode updatePayload = objectMapper.createObjectNode();
        updatePayload.put("name", "Cuadernos Premium");
        updatePayload.put("description", "Escolares premium");

        mockMvc.perform(put("/api/v1/categories/{id}", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Cuadernos Premium"));

        ObjectNode statusPayload = objectMapper.createObjectNode();
        statusPayload.put("active", false);

        mockMvc.perform(patch("/api/v1/categories/{id}/status", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusPayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/v1/categories")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").exists());
    }

    @Test
    void shouldBlockReservedCategoryMutations() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        Category reserved = categoryRepositoryPort.save(new Category(null, "Por clasificar", null, true, null, null, "system", "system"));

        ObjectNode updatePayload = objectMapper.createObjectNode();
        updatePayload.put("name", "Por clasificar");
        updatePayload.put("description", "No tocar");

        mockMvc.perform(put("/api/v1/categories/{id}", reserved.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload.toString()))
                .andExpect(status().isUnprocessableEntity());

        ObjectNode statusPayload = objectMapper.createObjectNode();
        statusPayload.put("active", false);

        mockMvc.perform(patch("/api/v1/categories/{id}/status", reserved.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusPayload.toString()))
                .andExpect(status().isUnprocessableEntity());
    }
}
