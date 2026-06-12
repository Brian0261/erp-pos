package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EcommerceAdminTaxonomyIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

    @Test
    void adminShouldCreateUpdateAndToggleBrand() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());

        long brandId = createBrand(adminToken, "Marca " + suffix, "marca-" + suffix);

        ObjectNode updatePayload = objectMapper.createObjectNode();
        updatePayload.put("name", "Marca Editada " + suffix);
        updatePayload.put("slug", "marca-editada-" + suffix);
        updatePayload.put("description", "Descripcion marca editada");

        mockMvc.perform(put("/api/v1/ecommerce-admin/brands/{id}", brandId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("marca-editada-" + suffix));

        ObjectNode inactivePayload = objectMapper.createObjectNode();
        inactivePayload.put("active", false);

        mockMvc.perform(patch("/api/v1/ecommerce-admin/brands/{id}/status", brandId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inactivePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        ObjectNode activePayload = objectMapper.createObjectNode();
        activePayload.put("active", true);

        mockMvc.perform(patch("/api/v1/ecommerce-admin/brands/{id}/status", brandId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(activePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void supervisorShouldReadBrandButCannotMutate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String supervisorToken = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());

        long brandId = createBrand(adminToken, "Marca " + suffix, "marca-" + suffix);

        mockMvc.perform(get("/api/v1/ecommerce-admin/brands")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists());

        mockMvc.perform(get("/api/v1/ecommerce-admin/brands/{id}", brandId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(brandId));

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("name", "Marca bloqueada");

        mockMvc.perform(post("/api/v1/ecommerce-admin/brands")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/ecommerce-admin/brands/{id}", brandId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isForbidden());

        ObjectNode statusPayload = objectMapper.createObjectNode();
        statusPayload.put("active", false);
        mockMvc.perform(patch("/api/v1/ecommerce-admin/brands/{id}/status", brandId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusPayload.toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldReturn409ForDuplicateBrandSlugAnd404ForMissingBrand() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        createBrand(adminToken, "Marca A " + suffix, "slug-unico-" + suffix);

        ObjectNode duplicatePayload = objectMapper.createObjectNode();
        duplicatePayload.put("name", "Marca B " + suffix);
        duplicatePayload.put("slug", "slug-unico-" + suffix);

        mockMvc.perform(post("/api/v1/ecommerce-admin/brands")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(duplicatePayload.toString()))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/v1/ecommerce-admin/brands/{id}", 999999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminShouldCreateUpdateAndToggleOnlineCategory() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());

        long parentId = createOnlineCategory(adminToken, "Padre " + suffix, "padre-" + suffix, null);
        long categoryId = createOnlineCategory(adminToken, "Hijo " + suffix, "hijo-" + suffix, parentId);

        ObjectNode updatePayload = objectMapper.createObjectNode();
        updatePayload.put("parentId", parentId);
        updatePayload.put("name", "Hijo Editado " + suffix);
        updatePayload.put("slug", "hijo-editado-" + suffix);
        updatePayload.put("description", "Descripcion categoria editada");

        mockMvc.perform(put("/api/v1/ecommerce-admin/online-categories/{id}", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("hijo-editado-" + suffix));

        ObjectNode inactivePayload = objectMapper.createObjectNode();
        inactivePayload.put("active", false);

        mockMvc.perform(patch("/api/v1/ecommerce-admin/online-categories/{id}/status", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inactivePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        ObjectNode activePayload = objectMapper.createObjectNode();
        activePayload.put("active", true);

        mockMvc.perform(patch("/api/v1/ecommerce-admin/online-categories/{id}/status", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(activePayload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void supervisorShouldReadCategoryButCannotMutate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String supervisorToken = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        long categoryId = createOnlineCategory(adminToken, "Categoria " + suffix, "categoria-" + suffix, null);

        mockMvc.perform(get("/api/v1/ecommerce-admin/online-categories")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists());

        mockMvc.perform(get("/api/v1/ecommerce-admin/online-categories/{id}", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(categoryId));

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("name", "Categoria bloqueada");

        mockMvc.perform(post("/api/v1/ecommerce-admin/online-categories")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/ecommerce-admin/online-categories/{id}", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isForbidden());

        ObjectNode statusPayload = objectMapper.createObjectNode();
        statusPayload.put("active", false);
        mockMvc.perform(patch("/api/v1/ecommerce-admin/online-categories/{id}/status", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusPayload.toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldReturn409ForDuplicateCategorySlugAnd404ForMissingCategory() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        createOnlineCategory(adminToken, "Categoria A " + suffix, "cat-unica-" + suffix, null);

        ObjectNode duplicatePayload = objectMapper.createObjectNode();
        duplicatePayload.put("name", "Categoria B " + suffix);
        duplicatePayload.put("slug", "cat-unica-" + suffix);

        mockMvc.perform(post("/api/v1/ecommerce-admin/online-categories")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(duplicatePayload.toString()))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/v1/ecommerce-admin/online-categories/{id}", 999999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldBlockDeactivationOfBrandAndCategoryUsedByPublishedProfile() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());

        long brandId = createBrand(adminToken, "Marca Publicada " + suffix, "marca-publicada-" + suffix);
        long onlineCategoryId = createOnlineCategory(adminToken, "Categoria Publicada " + suffix, "categoria-publicada-" + suffix, null);
        long productId = createProductWithDraftProfile(adminToken, suffix, BigDecimal.valueOf(11.00));

        ObjectNode profilePayload = objectMapper.createObjectNode();
        profilePayload.put("slug", "producto-publicado-" + suffix);
        profilePayload.put("onlineName", "Producto publicado " + suffix);
        profilePayload.put("onlineDescription", "Descripcion completa publicada " + suffix);
        profilePayload.put("onlineCategoryId", onlineCategoryId);
        profilePayload.put("brandId", brandId);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilePayload.toString()))
                .andExpect(status().isOk());

        ObjectNode seoPayload = objectMapper.createObjectNode();
        seoPayload.put("seoTitle", "SEO title " + suffix);
        seoPayload.put("seoDescription", "SEO description " + suffix);
        seoPayload.put("canonicalPath", "/productos/producto-publicado-" + suffix);
        seoPayload.put("robotsPolicy", "INDEX_FOLLOW");
        seoPayload.put("indexable", true);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/seo", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(seoPayload.toString()))
                .andExpect(status().isOk());

        ObjectNode assetPayload = objectMapper.createObjectNode();
        assetPayload.put("assetType", "PRODUCT_IMAGE");
        assetPayload.put("assetUrl", "/images/products/published-" + suffix + ".jpg");
        assetPayload.put("altText", "Principal " + suffix);
        assetPayload.put("source", "OWN");
        assetPayload.put("rightsConfirmed", true);
        assetPayload.put("displayOrder", 0);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/primary-asset", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assetPayload.toString()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/publish", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationStatus").value("PUBLISHED"));

        ObjectNode inactivePayload = objectMapper.createObjectNode();
        inactivePayload.put("active", false);

        mockMvc.perform(patch("/api/v1/ecommerce-admin/brands/{id}/status", brandId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inactivePayload.toString()))
                .andExpect(status().isConflict());

        mockMvc.perform(patch("/api/v1/ecommerce-admin/online-categories/{id}/status", onlineCategoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inactivePayload.toString()))
                .andExpect(status().isConflict());
    }

    private long createBrand(String token, String name, String slug) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("name", name);
        payload.put("slug", slug);
        payload.put("description", "Descripcion " + name);

        MvcResult result = mockMvc.perform(post("/api/v1/ecommerce-admin/brands")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    private long createOnlineCategory(String token, String name, String slug, Long parentId) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        if (parentId != null) {
            payload.put("parentId", parentId);
        }
        payload.put("name", name);
        payload.put("slug", slug);
        payload.put("description", "Descripcion " + name);

        MvcResult result = mockMvc.perform(post("/api/v1/ecommerce-admin/online-categories")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
    }

    private long createProductWithDraftProfile(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, salePrice);
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        return productId;
    }
}
