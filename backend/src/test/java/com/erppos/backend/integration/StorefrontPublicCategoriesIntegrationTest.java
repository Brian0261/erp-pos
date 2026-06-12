package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceSeoMetadataRepositoryPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

class StorefrontPublicCategoriesIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort;

    @Autowired
    private EcommerceSeoMetadataRepositoryPort seoMetadataRepositoryPort;

    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

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

    @Test
    void shouldReturnPublicCategoryDetailBySlugWithoutToken() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("cat-detail-" + suffix, "Cat Detail " + suffix, true);
        attachCategorySeo(category.id(), category.slug(), suffix, true, true);

        mockMvc.perform(get("/api/v1/storefront/catalog/categories/{slug}", category.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(category.slug()))
                .andExpect(jsonPath("$.name").value(category.name()))
                .andExpect(jsonPath("$.seo.title").value("SEO cat title " + suffix))
                .andExpect(jsonPath("$.seo.robots").value("INDEX_FOLLOW"));
    }

    @Test
    void shouldReturn404WhenCategorySlugDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/categories/{slug}", "missing-cat-slug"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PUBLIC_RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldReturn404WhenCategoryIsInactive() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("cat-inactive-detail-" + suffix, "Cat Inactive Detail " + suffix, false);

        mockMvc.perform(get("/api/v1/storefront/catalog/categories/{slug}", category.slug()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PUBLIC_RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldReturnCategoryDetailWithZeroProductsAsNotIndexable() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("cat-empty-" + suffix, "Cat Empty " + suffix, true);
        attachCategorySeo(category.id(), category.slug(), suffix, true, true);

        mockMvc.perform(get("/api/v1/storefront/catalog/categories/{slug}", category.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCount").value(0))
                .andExpect(jsonPath("$.indexable").value(false))
                .andExpect(jsonPath("$.seo.indexable").value(false));
    }

    @Test
    void shouldCountOnlyPublishedAndActiveProductsForCategoryDetail() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("cat-count-" + suffix, "Cat Count " + suffix, true);

        publishProductInCategory(adminToken, suffix + "-ok", category.id(), true);
        publishProductInCategory(adminToken, suffix + "-inactive", category.id(), false);
        createDraftProductInCategory(adminToken, suffix + "-draft", category.id());

        mockMvc.perform(get("/api/v1/storefront/catalog/categories/{slug}", category.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCount").value(1));
    }

    @Test
    void shouldSetIndexableTrueOnlyWhenSeoCompleteAndProductCountGreaterThanZero() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("cat-seo-ok-" + suffix, "Cat Seo Ok " + suffix, true);
        attachCategorySeo(category.id(), category.slug(), suffix, true, true);
        publishProductInCategory(adminToken, suffix + "-ok", category.id(), true);

        mockMvc.perform(get("/api/v1/storefront/catalog/categories/{slug}", category.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.indexable").value(true))
                .andExpect(jsonPath("$.seo.indexable").value(true))
                .andExpect(jsonPath("$.canonicalUrl").value("/categorias/" + category.slug()));
    }

    @Test
    void shouldSetIndexableFalseWhenSeoMetadataIsIncomplete() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("cat-seo-incomplete-" + suffix, "Cat Seo Incomplete " + suffix, true);
        attachCategorySeo(category.id(), category.slug(), suffix, false, true);
        publishProductInCategory(adminToken, suffix + "-ok", category.id(), true);

        mockMvc.perform(get("/api/v1/storefront/catalog/categories/{slug}", category.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.indexable").value(false))
                .andExpect(jsonPath("$.seo.indexable").value(false));
    }

    @Test
    void shouldNotExposeInternalFieldsInCategoryDetail() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("cat-detail-safe-" + suffix, "Cat Detail Safe " + suffix, true);

        JsonNode detail = readJson(mockMvc.perform(get("/api/v1/storefront/catalog/categories/{slug}", category.slug()))
                .andExpect(status().isOk())
                .andReturn());

        org.junit.jupiter.api.Assertions.assertFalse(detail.has("id"));
        org.junit.jupiter.api.Assertions.assertFalse(detail.has("parentId"));
        org.junit.jupiter.api.Assertions.assertFalse(detail.has("createdAt"));
        org.junit.jupiter.api.Assertions.assertFalse(detail.has("updatedAt"));
        org.junit.jupiter.api.Assertions.assertFalse(detail.has("createdBy"));
        org.junit.jupiter.api.Assertions.assertFalse(detail.has("updatedBy"));
    }

    private EcommerceOnlineCategory createOnlineCategory(String slug, String name, boolean active) {
        return onlineCategoryRepositoryPort.save(new EcommerceOnlineCategory(
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

    private void attachCategorySeo(Long categoryId, String slug, String suffix, boolean completeMetadata, boolean indexableFlag) {
        seoMetadataRepositoryPort.save(new EcommerceSeoMetadata(
                null,
                null,
                categoryId,
                null,
                "SEO cat title " + suffix,
                completeMetadata ? "SEO cat description " + suffix : null,
                completeMetadata ? "/categorias/" + slug : null,
                RobotsPolicy.INDEX_FOLLOW,
                indexableFlag,
                "OG cat title " + suffix,
                "OG cat description " + suffix,
                "https://cdn.example.test/seo-cat-" + suffix + ".jpg",
                null,
                null,
                "it",
                "it"
        ));
    }

    private void publishProductInCategory(String adminToken, String suffix, Long onlineCategoryId, boolean activeProduct) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, BigDecimal.valueOf(25.00));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(product.productId()));
        String slug = "slug-cat-" + suffix;

        ObjectNode profilePayload = objectMapper.createObjectNode();
        profilePayload.put("slug", slug);
        profilePayload.put("onlineName", "Nombre cat " + suffix);
        profilePayload.put("onlineDescription", "Descripcion cat " + suffix);
        profilePayload.put("onlineCategoryId", onlineCategoryId);
        profilePayload.put("brandAbsencePolicy", "GENERIC");

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilePayload.toString()))
                .andExpect(status().isOk());

        ObjectNode seoPayload = objectMapper.createObjectNode();
        seoPayload.put("seoTitle", "SEO title cat " + suffix);
        seoPayload.put("seoDescription", "SEO description cat " + suffix);
        seoPayload.put("canonicalPath", "/productos/" + slug);
        seoPayload.put("robotsPolicy", "INDEX_FOLLOW");
        seoPayload.put("indexable", true);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/seo", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(seoPayload.toString()))
                .andExpect(status().isOk());

        ObjectNode assetPayload = objectMapper.createObjectNode();
        assetPayload.put("assetType", "PRODUCT_IMAGE");
        assetPayload.put("assetUrl", "/images/products/category-" + suffix + ".jpg");
        assetPayload.put("altText", "Imagen categoria " + suffix);
        assetPayload.put("source", "OWN");
        assetPayload.put("rightsConfirmed", true);
        assetPayload.put("displayOrder", 0);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/primary-asset", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assetPayload.toString()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/publish", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        if (!activeProduct) {
            ObjectNode updatePayload = objectMapper.createObjectNode();
            updatePayload.put("sku", product.sku());
            updatePayload.put("barcode", product.barcode());
            updatePayload.put("name", product.name());
            updatePayload.put("description", "Producto inactivo " + suffix);
            updatePayload.put("categoryId", product.categoryId());
            updatePayload.put("unitId", product.unitId());
            updatePayload.put("salePrice", product.salePrice());
            updatePayload.put("active", false);

            mockMvc.perform(put("/api/v1/products/{id}", product.productId())
                            .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(updatePayload.toString()))
                    .andExpect(status().isOk());
        }
    }

    private void createDraftProductInCategory(String adminToken, String suffix, Long onlineCategoryId) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, BigDecimal.valueOf(19.00));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(product.productId()));

        ObjectNode profilePayload = objectMapper.createObjectNode();
        profilePayload.put("slug", "slug-draft-" + suffix);
        profilePayload.put("onlineName", "Nombre draft " + suffix);
        profilePayload.put("onlineDescription", "Descripcion draft " + suffix);
        profilePayload.put("onlineCategoryId", onlineCategoryId);
        profilePayload.put("brandAbsencePolicy", "GENERIC");

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilePayload.toString()))
                .andExpect(status().isOk());
    }

    private ProductFixture createProductFixture(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        String compact = compactToken(suffix);
        long categoryId = createCategory(adminToken, compact);
        long unitId = createUnit(adminToken, compact);
        long productId = createProduct(adminToken, categoryId, unitId, compact, salePrice);

        return new ProductFixture(
                productId,
                categoryId,
                unitId,
                "SKU-IT-" + compact,
                "BC-IT-" + compact,
                "Producto IT " + compact,
                salePrice
        );
    }

    private String compactToken(String value) {
        if (value.length() <= 12) {
            return value;
        }
        return value.substring(value.length() - 12);
    }

    private JsonNode findBySlug(JsonNode items, String slug) {
        for (JsonNode item : items) {
            if (slug.equals(item.path("slug").asText())) {
                return item;
            }
        }
        return null;
    }

    private record ProductFixture(
            long productId,
            long categoryId,
            long unitId,
            String sku,
            String barcode,
            String name,
            BigDecimal salePrice
    ) {
    }
}
