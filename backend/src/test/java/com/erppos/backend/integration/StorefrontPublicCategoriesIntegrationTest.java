package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StorefrontPublicCategoriesIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort;

    @Test
    void shouldAllowPublicCategoriesGetWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(50));
    }

    @Test
    void shouldReturnOnlyActiveCategories() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        createOnlineCategory("cat-active-" + suffix, "Cat Active " + suffix, true);
        createOnlineCategory("cat-inactive-" + suffix, "Cat Inactive " + suffix, false);

        JsonNode items = readJson(mockMvc.perform(get("/api/v1/storefront/catalog/categories").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn()).path("items");

        org.junit.jupiter.api.Assertions.assertNotNull(findBySlug(items, "cat-active-" + suffix));
        org.junit.jupiter.api.Assertions.assertNull(findBySlug(items, "cat-inactive-" + suffix));
    }

    @Test
    void shouldReturnEmptyItemsForOutOfRangePage() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/categories")
                        .param("page", "999")
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void shouldApplyPageAndSize() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        createOnlineCategory("cat-page-a-" + suffix, "Cat Page A " + suffix, true);
        createOnlineCategory("cat-page-b-" + suffix, "Cat Page B " + suffix, true);
        createOnlineCategory("cat-page-c-" + suffix, "Cat Page C " + suffix, true);

        mockMvc.perform(get("/api/v1/storefront/catalog/categories")
                        .param("page", "1")
                        .param("size", "1")
                        .param("sort", "name_asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.totalItems", greaterThanOrEqualTo(3)));
    }

    @Test
    void shouldReturn400WhenSizeIsGreaterThan100() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/categories").param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PUBLIC_INVALID_REQUEST"));
    }

    @Test
    void shouldReturn400WhenSortIsInvalid() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/categories").param("sort", "name_desc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PUBLIC_INVALID_REQUEST"));
    }

    @Test
    void shouldReturn400WhenPageIsNotNumeric() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/categories").param("page", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PUBLIC_INVALID_REQUEST"));
    }

    @Test
    void shouldReturn400WhenSizeIsNotNumeric() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/categories").param("size", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PUBLIC_INVALID_REQUEST"));
    }

    @Test
    void shouldNotExposeInternalFields() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String slug = "cat-safe-" + suffix;
        createOnlineCategory(slug, "Cat Safe " + suffix, true);

        JsonNode items = readJson(mockMvc.perform(get("/api/v1/storefront/catalog/categories").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn()).path("items");
        JsonNode target = findBySlug(items, slug);

        org.junit.jupiter.api.Assertions.assertNotNull(target);
        org.junit.jupiter.api.Assertions.assertFalse(target.has("id"));
        org.junit.jupiter.api.Assertions.assertFalse(target.has("parentId"));
        org.junit.jupiter.api.Assertions.assertFalse(target.has("createdAt"));
        org.junit.jupiter.api.Assertions.assertFalse(target.has("updatedAt"));
        org.junit.jupiter.api.Assertions.assertFalse(target.has("createdBy"));
        org.junit.jupiter.api.Assertions.assertFalse(target.has("updatedBy"));
    }

    private void createOnlineCategory(String slug, String name, boolean active) {
        onlineCategoryRepositoryPort.save(new EcommerceOnlineCategory(
                null,
                null,
                name,
                slug,
                "Desc " + name,
                active,
                null,
                null,
                "it",
                "it"
        ));
    }

    private JsonNode findBySlug(JsonNode items, String slug) {
        for (JsonNode item : items) {
            if (slug.equals(item.path("slug").asText())) {
                return item;
            }
        }
        return null;
    }
}
