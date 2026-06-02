package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceSeoMetadataRepositoryPort;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StorefrontPublicSitemapIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

    @Autowired
    private EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort;

    @Autowired
    private EcommerceSeoMetadataRepositoryPort seoMetadataRepositoryPort;

    @Test
    void shouldAllowSitemapGetWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/seo/sitemap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generatedAt").exists())
                .andExpect(jsonPath("$.entries").isArray())
                .andExpect(jsonPath("$.totalEntries").isNumber());
    }

    @Test
    void shouldIncludePublishedActiveIndexableProductAndCategory() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());

        EcommerceOnlineCategory category = createOnlineCategory("cat-map-inc-" + suffix, "Cat Map Inc " + suffix, true);
        attachCategorySeo(category.id(), category.slug(), suffix, true);
        publishProductWithCategory(adminToken, suffix, category.id(), true, true);

        JsonNode entries = readJson(mockMvc.perform(get("/api/v1/storefront/seo/sitemap"))
                .andExpect(status().isOk())
                .andReturn()).path("entries");

        org.junit.jupiter.api.Assertions.assertNotNull(findByLoc(entries, "/productos/slug-map-" + suffix));
        JsonNode categoryEntry = findByLoc(entries, "/categorias/" + category.slug());
        org.junit.jupiter.api.Assertions.assertNotNull(categoryEntry);
        org.junit.jupiter.api.Assertions.assertEquals("CATEGORY", categoryEntry.path("type").asText());
    }

    @Test
    void shouldExcludeUnpublishedInactiveAndNonIndexableProducts() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("cat-map-exc-" + suffix, "Cat Map Exc " + suffix, true);

        publishProductWithCategory(adminToken, suffix + "-ok", category.id(), true, true);
        createDraftProductWithCategory(adminToken, suffix + "-draft", category.id());
        publishProductWithCategory(adminToken, suffix + "-inactive", category.id(), false, true);
        publishProductWithCategory(adminToken, suffix + "-noidx", category.id(), true, false);

        JsonNode entries = readJson(mockMvc.perform(get("/api/v1/storefront/seo/sitemap"))
                .andExpect(status().isOk())
                .andReturn()).path("entries");

        org.junit.jupiter.api.Assertions.assertNotNull(findByLoc(entries, "/productos/slug-map-" + suffix + "-ok"));
        org.junit.jupiter.api.Assertions.assertNull(findByLoc(entries, "/productos/slug-map-" + suffix + "-draft"));
        org.junit.jupiter.api.Assertions.assertNull(findByLoc(entries, "/productos/slug-map-" + suffix + "-inactive"));
        org.junit.jupiter.api.Assertions.assertNull(findByLoc(entries, "/productos/slug-map-" + suffix + "-noidx"));
    }

    @Test
    void shouldExcludeEmptyAndInactiveCategories() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());

        EcommerceOnlineCategory activeWithProducts = createOnlineCategory("cat-map-ok-" + suffix, "Cat Map Ok " + suffix, true);
        attachCategorySeo(activeWithProducts.id(), activeWithProducts.slug(), suffix + "-ok", true);
        publishProductWithCategory(adminToken, suffix + "-ok", activeWithProducts.id(), true, true);

        EcommerceOnlineCategory emptyCategory = createOnlineCategory("cat-map-empty-" + suffix, "Cat Map Empty " + suffix, true);
        attachCategorySeo(emptyCategory.id(), emptyCategory.slug(), suffix + "-empty", true);

        EcommerceOnlineCategory inactiveCategory = createOnlineCategory("cat-map-inactive-" + suffix, "Cat Map Inactive " + suffix, false);
        attachCategorySeo(inactiveCategory.id(), inactiveCategory.slug(), suffix + "-inactive", true);

        JsonNode entries = readJson(mockMvc.perform(get("/api/v1/storefront/seo/sitemap"))
                .andExpect(status().isOk())
                .andReturn()).path("entries");

        org.junit.jupiter.api.Assertions.assertNotNull(findByLoc(entries, "/categorias/" + activeWithProducts.slug()));
        org.junit.jupiter.api.Assertions.assertNull(findByLoc(entries, "/categorias/" + emptyCategory.slug()));
        org.junit.jupiter.api.Assertions.assertNull(findByLoc(entries, "/categorias/" + inactiveCategory.slug()));
    }

    @Test
    void shouldNotExposeInternalFieldsOrApiAdminPaths() throws Exception {
        JsonNode entries = readJson(mockMvc.perform(get("/api/v1/storefront/seo/sitemap"))
                .andExpect(status().isOk())
                .andReturn()).path("entries");

        for (JsonNode entry : entries) {
            org.junit.jupiter.api.Assertions.assertFalse(entry.has("id"));
            org.junit.jupiter.api.Assertions.assertFalse(entry.has("productId"));
            org.junit.jupiter.api.Assertions.assertFalse(entry.has("categoryId"));
            String loc = entry.path("loc").asText();
            org.junit.jupiter.api.Assertions.assertTrue(loc.startsWith("/"));
            org.junit.jupiter.api.Assertions.assertFalse(loc.startsWith("/api/"));
            org.junit.jupiter.api.Assertions.assertFalse(loc.startsWith("/ecommerce-admin/"));
        }
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

    private void attachCategorySeo(Long categoryId, String slug, String suffix, boolean indexable) {
        seoMetadataRepositoryPort.save(new EcommerceSeoMetadata(
                null,
                null,
                categoryId,
                null,
                "SEO cat title " + suffix,
                "SEO cat description " + suffix,
                "/categorias/" + slug,
                RobotsPolicy.INDEX_FOLLOW,
                indexable,
                "OG cat title " + suffix,
                "OG cat description " + suffix,
                "https://cdn.example.test/seo-cat-" + suffix + ".jpg",
                null,
                null,
                "it",
                "it"
        ));
    }

    private void publishProductWithCategory(String adminToken, String suffix, Long onlineCategoryId, boolean activeProduct, boolean indexableSeo) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, BigDecimal.valueOf(25.00));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(product.productId()));
        String slug = "slug-map-" + suffix;

        ObjectNode profilePayload = objectMapper.createObjectNode();
        profilePayload.put("slug", slug);
        profilePayload.put("onlineName", "Nombre map " + suffix);
        profilePayload.put("onlineDescription", "Descripcion map " + suffix);
        profilePayload.put("onlineCategoryId", onlineCategoryId);
        profilePayload.put("brandAbsencePolicy", "GENERIC");

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilePayload.toString()))
                .andExpect(status().isOk());

        ObjectNode seoPayload = objectMapper.createObjectNode();
        seoPayload.put("seoTitle", "SEO title map " + suffix);
        seoPayload.put("seoDescription", "SEO description map " + suffix);
        seoPayload.put("canonicalPath", "/productos/" + slug);
        seoPayload.put("robotsPolicy", "INDEX_FOLLOW");
        seoPayload.put("indexable", indexableSeo);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/seo", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(seoPayload.toString()))
                .andExpect(status().isOk());

        ObjectNode assetPayload = objectMapper.createObjectNode();
        assetPayload.put("assetType", "PRODUCT_IMAGE");
        assetPayload.put("assetUrl", "https://cdn.example.test/map-" + suffix + ".jpg");
        assetPayload.put("altText", "Imagen map " + suffix);
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

    private void createDraftProductWithCategory(String adminToken, String suffix, Long onlineCategoryId) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, BigDecimal.valueOf(19.00));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(product.productId()));

        ObjectNode profilePayload = objectMapper.createObjectNode();
        profilePayload.put("slug", "slug-map-" + suffix);
        profilePayload.put("onlineName", "Nombre draft map " + suffix);
        profilePayload.put("onlineDescription", "Descripcion draft map " + suffix);
        profilePayload.put("onlineCategoryId", onlineCategoryId);
        profilePayload.put("brandAbsencePolicy", "GENERIC");

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilePayload.toString()))
                .andExpect(status().isOk());
    }

    private ProductFixture createProductFixture(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        String compact = compactToken(suffix + System.nanoTime());
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

    private JsonNode findByLoc(JsonNode items, String loc) {
        for (JsonNode item : items) {
            if (loc.equals(item.path("loc").asText())) {
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
