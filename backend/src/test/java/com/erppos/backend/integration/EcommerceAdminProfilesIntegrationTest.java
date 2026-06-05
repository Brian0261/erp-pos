package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceBrandRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EcommerceAdminProfilesIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

    @Autowired
    private EcommerceBrandRepositoryPort brandRepositoryPort;

    @Autowired
    private EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort;

    @Test
    void adminShouldCreateDraftOnlineProfileFromExistingProduct() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productId = createProductWithoutDraftProfile(adminToken, suffix, BigDecimal.valueOf(10.00));

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.profileId").isNumber())
                .andExpect(jsonPath("$.productId").value(productId))
                .andExpect(jsonPath("$.publicationStatus").value("DRAFT"));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value(productId))
                .andExpect(jsonPath("$.publicationStatus").value("DRAFT"));
    }

    @Test
    void shouldReturn409WhenCreatingDuplicateOnlineProfile() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productId = createProductWithoutDraftProfile(adminToken, suffix, BigDecimal.valueOf(10.00));

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldReturn404WhenCreatingOnlineProfileForMissingProduct() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/online-profile", 999999999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void supervisorShouldNotCreateOnlineProfile() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String supervisorToken = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productId = createProductWithoutDraftProfile(adminToken, suffix, BigDecimal.valueOf(10.00));

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminShouldManageOnlineProfileAndPublishFlow() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productId = createProductWithDraftProfile(adminToken, suffix, BigDecimal.valueOf(10.00));
        long brandId = createOnlineBrand(suffix);
        long onlineCategoryId = createOnlineCategory(suffix);

        ObjectNode profilePayload = objectMapper.createObjectNode();
        profilePayload.put("slug", "lapicero-online-" + suffix);
        profilePayload.put("onlineName", "Lapicero online " + suffix);
        profilePayload.put("onlineDescription", "Descripcion online completa " + suffix);
        profilePayload.put("onlineCategoryId", onlineCategoryId);
        profilePayload.put("brandId", brandId);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("lapicero-online-" + suffix));

        ObjectNode seoPayload = objectMapper.createObjectNode();
        seoPayload.put("seoTitle", "SEO title " + suffix);
        seoPayload.put("seoDescription", "SEO description " + suffix);
        seoPayload.put("canonicalPath", "/productos/lapicero-online-" + suffix);
        seoPayload.put("robotsPolicy", "INDEX_FOLLOW");
        seoPayload.put("indexable", true);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/seo", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(seoPayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.indexable").value(true));

        ObjectNode assetPayload = objectMapper.createObjectNode();
        assetPayload.put("assetType", "PRODUCT_IMAGE");
        assetPayload.put("assetUrl", "https://cdn.example.test/product-" + suffix + ".jpg");
        assetPayload.put("altText", "Lapicero principal " + suffix);
        assetPayload.put("source", "OWN");
        assetPayload.put("rightsConfirmed", true);
        assetPayload.put("displayOrder", 0);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/primary-asset", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assetPayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetType").value("PRODUCT_IMAGE"));

        ObjectNode pricePayload = objectMapper.createObjectNode();
        pricePayload.put("amount", BigDecimal.valueOf(8.90));
        pricePayload.put("currency", "PEN");
        pricePayload.put("active", true);
        pricePayload.put("reason", "Promo IT " + suffix);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/price-override", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(pricePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(8.9));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/publication-validation", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publishable").value(true))
                .andExpect(jsonPath("$.errors").isArray());

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/publish", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationStatus").value("PUBLISHED"));

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/unpublish", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationStatus").value("UNPUBLISHED"));
    }

    @Test
    void supervisorShouldReadButCannotPublishOrChangePrice() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String supervisorToken = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productId = createProductWithDraftProfile(adminToken, suffix, BigDecimal.valueOf(12.00));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/online-profiles?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value(productId));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/publication-validation", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publishable").value(false));

        ObjectNode pricePayload = objectMapper.createObjectNode();
        pricePayload.put("amount", BigDecimal.valueOf(7.50));
        pricePayload.put("currency", "PEN");
        pricePayload.put("active", true);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/price-override", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(pricePayload.toString()))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/publish", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldReturn404WhenOnlineProfileDoesNotExist() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", 999999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn409ForDuplicateSlug() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productIdA = createProductWithDraftProfile(adminToken, suffix + "a", BigDecimal.valueOf(5.00));
        long productIdB = createProductWithDraftProfile(adminToken, suffix + "b", BigDecimal.valueOf(6.00));

        ObjectNode firstPayload = objectMapper.createObjectNode();
        firstPayload.put("slug", "slug-dup-" + suffix);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", productIdA)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firstPayload.toString()))
                .andExpect(status().isOk());

        ObjectNode duplicatePayload = objectMapper.createObjectNode();
        duplicatePayload.put("slug", "slug-dup-" + suffix);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", productIdB)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(duplicatePayload.toString()))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldReturn409ForSlugChangeAfterPublished() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productId = createProductWithDraftProfile(adminToken, suffix, BigDecimal.valueOf(10.00));
        long brandId = createOnlineBrand(suffix);
        long onlineCategoryId = createOnlineCategory(suffix);

        updateProfileForPublish(adminToken, productId, suffix, brandId, onlineCategoryId);
        upsertSeoForPublish(adminToken, productId, suffix);
        upsertAssetForPublish(adminToken, productId, suffix);

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/publish", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("slug", "otro-slug-publicado-" + suffix);
        payload.put("onlineName", "Lapicero online " + suffix);
        payload.put("onlineDescription", "Descripcion online completa " + suffix);
        payload.put("onlineCategoryId", onlineCategoryId);
        payload.put("brandId", brandId);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldReturn422WhenPublishingIncompleteProfile() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productId = createProductWithDraftProfile(adminToken, suffix, BigDecimal.valueOf(10.00));

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/publish", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void validationEndpointShouldReturnBackendChecklistErrors() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long productId = createProductWithDraftProfile(adminToken, suffix, BigDecimal.valueOf(10.00));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/publication-validation", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publishable").value(false))
                .andExpect(jsonPath("$.errors").isArray())
                .andExpect(jsonPath("$.errors.length()").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    private long createProductWithDraftProfile(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        long productId = createProductWithoutDraftProfile(adminToken, suffix, salePrice);
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        return productId;
    }

    private long createProductWithoutDraftProfile(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        return createProduct(adminToken, categoryId, unitId, suffix, salePrice);
    }

    private long createOnlineBrand(String suffix) {
        EcommerceBrand saved = brandRepositoryPort.save(new EcommerceBrand(
                null,
                "Marca IT " + suffix,
                "marca-it-" + suffix,
                "Marca de prueba",
                true,
                null,
                null,
                "it",
                "it"
        ));
        return saved.id();
    }

    private long createOnlineCategory(String suffix) {
        EcommerceOnlineCategory saved = onlineCategoryRepositoryPort.save(new EcommerceOnlineCategory(
                null,
                null,
                "Online Cat IT " + suffix,
                "online-cat-it-" + suffix,
                "Categoria online de prueba",
                true,
                null,
                null,
                "it",
                "it"
        ));
        return saved.id();
    }

    private void updateProfileForPublish(String adminToken, long productId, String suffix, long brandId, long onlineCategoryId) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("slug", "lapicero-online-" + suffix);
        payload.put("onlineName", "Lapicero online " + suffix);
        payload.put("onlineDescription", "Descripcion online completa " + suffix);
        payload.put("onlineCategoryId", onlineCategoryId);
        payload.put("brandId", brandId);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }

    private void upsertSeoForPublish(String adminToken, long productId, String suffix) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("seoTitle", "SEO title " + suffix);
        payload.put("seoDescription", "SEO description " + suffix);
        payload.put("canonicalPath", "/productos/lapicero-online-" + suffix);
        payload.put("robotsPolicy", "INDEX_FOLLOW");
        payload.put("indexable", true);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/seo", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }

    private void upsertAssetForPublish(String adminToken, long productId, String suffix) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("assetType", "PRODUCT_IMAGE");
        payload.put("assetUrl", "https://cdn.example.test/product-" + suffix + ".jpg");
        payload.put("altText", "Lapicero principal " + suffix);
        payload.put("source", "OWN");
        payload.put("rightsConfirmed", true);
        payload.put("displayOrder", 0);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/primary-asset", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }
}
