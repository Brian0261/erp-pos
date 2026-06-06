package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StorefrontPublicProductsIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

    @Autowired
    private EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort;

    @Autowired
    private ProductOnlineProfileRepositoryPort productOnlineProfileRepositoryPort;

    @Test
    void shouldAllowPublicProductsGetWithoutToken() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(15.40), BigDecimal.valueOf(12.50));

        mockMvc.perform(get("/api/v1/storefront/catalog/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    void shouldAllowPublicProductDetailGetWithoutToken() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(18.25), null);

        mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", product.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(product.slug()))
                .andExpect(jsonPath("$.name").isNotEmpty())
                .andExpect(jsonPath("$.price.amount").value(18.25));
    }

    @Test
    void shouldListOnlyPublishedAndActiveProducts() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String base = String.valueOf(System.nanoTime());

        ProductFixture published = createPublishedProfile(adminToken, base + "-pub", BigDecimal.valueOf(22.30), null);
        createDraftProfileOnly(adminToken, base + "-draft");
        createUnpublishedProfile(adminToken, base + "-unpub");
        createBlockedProfile(adminToken, base + "-blocked");
        ProductFixture inactivePublished = createPublishedProfile(adminToken, base + "-inactive", BigDecimal.valueOf(33.40), null);
        deactivateProduct(adminToken, inactivePublished);

        MvcResult result = mockMvc.perform(get("/api/v1/storefront/catalog/products").param("size", "50"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = readJson(result);
        JsonNode items = root.path("items");

        boolean foundPublished = false;
        for (JsonNode item : items) {
            String slug = item.path("slug").asText();
            if (slug.equals("slug-storefront-" + base + "-pub")) {
                foundPublished = true;
            }
            org.junit.jupiter.api.Assertions.assertNotEquals("slug-storefront-" + base + "-draft", slug);
            org.junit.jupiter.api.Assertions.assertNotEquals("slug-storefront-" + base + "-unpub", slug);
            org.junit.jupiter.api.Assertions.assertNotEquals("slug-storefront-" + base + "-blocked", slug);
            org.junit.jupiter.api.Assertions.assertNotEquals("slug-storefront-" + base + "-inactive", slug);
        }

        org.junit.jupiter.api.Assertions.assertTrue(foundPublished);
        org.junit.jupiter.api.Assertions.assertEquals(published.slug(), "slug-storefront-" + base + "-pub");
    }

    @Test
    void shouldNotExposeInternalFields() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(19.90), null);

        mockMvc.perform(get("/api/v1/storefront/catalog/products").param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").doesNotExist())
                .andExpect(jsonPath("$.items[0].productId").doesNotExist())
                .andExpect(jsonPath("$.items[0].profileId").doesNotExist())
                .andExpect(jsonPath("$.items[0].categoryId").doesNotExist())
                .andExpect(jsonPath("$.items[0].brandId").doesNotExist())
                .andExpect(jsonPath("$.items[0].publicationStatus").doesNotExist())
                .andExpect(jsonPath("$.items[0].stockQuantity").doesNotExist())
                .andExpect(jsonPath("$.items[0].cost").doesNotExist())
                .andExpect(jsonPath("$.items[0].margin").doesNotExist())
                .andExpect(jsonPath("$.items[0].createdBy").doesNotExist())
                .andExpect(jsonPath("$.items[0].updatedBy").doesNotExist());
    }

    @Test
    void shouldApplyPageAndSize() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String base = String.valueOf(System.nanoTime());
        createPublishedProfile(adminToken, base + "-a", BigDecimal.valueOf(10), null);
        createPublishedProfile(adminToken, base + "-b", BigDecimal.valueOf(11), null);
        createPublishedProfile(adminToken, base + "-c", BigDecimal.valueOf(12), null);

        mockMvc.perform(get("/api/v1/storefront/catalog/products")
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
    void shouldReturn400WhenSizeIsGreaterThan50() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/products").param("size", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PUBLIC_INVALID_REQUEST"));
    }

    @Test
    void shouldReturn400WhenSortIsInvalid() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/products").param("sort", "price_asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PUBLIC_INVALID_REQUEST"));
    }

    @Test
    void shouldReturn400WhenPageIsNotNumeric() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/products").param("page", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PUBLIC_INVALID_REQUEST"));
    }

    @Test
    void shouldReturn400WhenSizeIsNotNumeric() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/products").param("size", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PUBLIC_INVALID_REQUEST"));
    }

    @Test
    void shouldCalculatePriceInBackendWithActiveOverride() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(99.00), BigDecimal.valueOf(79.90));

        MvcResult result = mockMvc.perform(get("/api/v1/storefront/catalog/products").param("size", "50"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode items = readJson(result).path("items");
        JsonNode target = findBySlug(items, product.slug());
        org.junit.jupiter.api.Assertions.assertNotNull(target);
        org.junit.jupiter.api.Assertions.assertEquals(79.9, target.path("price").path("amount").asDouble());
        org.junit.jupiter.api.Assertions.assertEquals("PEN", target.path("price").path("currency").asText());
    }

    @Test
    void shouldExposeConservativeAvailabilityWithoutStockQuantity() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(45.00), null);

        mockMvc.perform(get("/api/v1/storefront/catalog/products").param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].availability.status").value("NOT_AVAILABLE"))
                .andExpect(jsonPath("$.items[0].availability.purchasable").value(false))
                .andExpect(jsonPath("$.items[0].availability.stock").doesNotExist())
                .andExpect(jsonPath("$.items[0].availability.stockQuantity").doesNotExist());
    }

    @Test
    void shouldReturn404WhenProductSlugDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", "slug-does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PUBLIC_RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldReturn404WhenProductIsNotPublished() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        ProductFixture unpublished = createUnpublishedProfile(adminToken, suffix);

        mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", unpublished.slug()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PUBLIC_RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldReturn404WhenProductIsInactive() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(25.00), null);
        deactivateProduct(adminToken, product);

        mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", product.slug()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PUBLIC_RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldNotExposeInternalFieldsInDetailResponse() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(29.90), null);

        mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", product.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.productId").doesNotExist())
                .andExpect(jsonPath("$.profileId").doesNotExist())
                .andExpect(jsonPath("$.categoryId").doesNotExist())
                .andExpect(jsonPath("$.brandId").doesNotExist())
                .andExpect(jsonPath("$.publicationStatus").doesNotExist())
                .andExpect(jsonPath("$.stockQuantity").doesNotExist())
                .andExpect(jsonPath("$.cost").doesNotExist())
                .andExpect(jsonPath("$.margin").doesNotExist())
                .andExpect(jsonPath("$.createdBy").doesNotExist())
                .andExpect(jsonPath("$.updatedBy").doesNotExist());
    }

    @Test
    void shouldCalculateDetailPriceInBackendWithActiveOverride() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(90.00), BigDecimal.valueOf(65.50));

        mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", product.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.price.amount").value(65.5))
                .andExpect(jsonPath("$.price.currency").value("PEN"));
    }

    @Test
    void shouldExposeConservativeDetailAvailabilityWithoutStockQuantity() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(54.00), null);

        mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", product.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availability.status").value("NOT_AVAILABLE"))
                .andExpect(jsonPath("$.availability.purchasable").value(false))
                .andExpect(jsonPath("$.availability.stock").doesNotExist())
                .andExpect(jsonPath("$.availability.stockQuantity").doesNotExist());
    }

    @Test
    void shouldReturnPublicSeoMetadataWhenAvailable() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(70.00), null);

        mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", product.slug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seo.title").value("SEO title storefront " + suffix))
                .andExpect(jsonPath("$.seo.description").value("SEO description storefront " + suffix))
                .andExpect(jsonPath("$.seo.canonicalUrl").value("/productos/" + product.slug()))
                .andExpect(jsonPath("$.canonicalUrl").value("/productos/" + product.slug()))
                .andExpect(jsonPath("$.indexable").value(true));
    }

    private ProductFixture createPublishedProfile(String adminToken, String suffix, BigDecimal salePrice, BigDecimal overrideAmount) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, salePrice);
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(product.productId()));

        long onlineCategoryId = onlineCategoryRepositoryPort.findAll().stream()
                .filter(cat -> cat.slug().equals("online-cat-storefront-" + suffix))
                .map(cat -> cat.id())
                .findFirst()
                .orElseThrow();

        ObjectNode profilePayload = objectMapper.createObjectNode();
        profilePayload.put("slug", product.slug());
        profilePayload.put("onlineName", "Nombre storefront " + suffix);
        profilePayload.put("onlineDescription", "Descripcion storefront " + suffix);
        profilePayload.put("onlineCategoryId", onlineCategoryId);
        profilePayload.put("brandAbsencePolicy", "GENERIC");

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/online-profile", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilePayload.toString()))
                .andExpect(status().isOk());

        ObjectNode seoPayload = objectMapper.createObjectNode();
        seoPayload.put("seoTitle", "SEO title storefront " + suffix);
        seoPayload.put("seoDescription", "SEO description storefront " + suffix);
        seoPayload.put("canonicalPath", "/productos/" + product.slug());
        seoPayload.put("robotsPolicy", "INDEX_FOLLOW");
        seoPayload.put("indexable", true);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/seo", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(seoPayload.toString()))
                .andExpect(status().isOk());

        ObjectNode assetPayload = objectMapper.createObjectNode();
        assetPayload.put("assetType", "PRODUCT_IMAGE");
        assetPayload.put("assetUrl", "https://cdn.example.test/storefront-" + suffix + ".jpg");
        assetPayload.put("altText", "Imagen storefront " + suffix);
        assetPayload.put("source", "OWN");
        assetPayload.put("rightsConfirmed", true);
        assetPayload.put("displayOrder", 0);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/primary-asset", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assetPayload.toString()))
                .andExpect(status().isOk());

        if (overrideAmount != null) {
            ObjectNode pricePayload = objectMapper.createObjectNode();
            pricePayload.put("amount", overrideAmount);
            pricePayload.put("currency", "PEN");
            pricePayload.put("active", true);
            pricePayload.put("reason", "Override storefront " + suffix);

            mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/price-override", product.productId())
                            .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(pricePayload.toString()))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/publish", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        return product;
    }

    private void createDraftProfileOnly(String adminToken, String suffix) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, BigDecimal.valueOf(18.00));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(product.productId()));
    }

    private ProductFixture createUnpublishedProfile(String adminToken, String suffix) throws Exception {
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(20.00), null);
        mockMvc.perform(post("/api/v1/ecommerce-admin/products/{productId}/unpublish", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        return product;
    }

    private void createBlockedProfile(String adminToken, String suffix) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, BigDecimal.valueOf(21.00));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(product.productId()));

        ProductOnlineProfile draft = productOnlineProfileRepositoryPort.findByProductId(product.productId()).orElseThrow();
        productOnlineProfileRepositoryPort.save(new ProductOnlineProfile(
                draft.id(),
                draft.productId(),
                OnlinePublicationStatus.BLOCKED,
                draft.slug(),
                draft.onlineName(),
                draft.onlineDescription(),
                draft.onlineCategoryId(),
                draft.brandId(),
                draft.brandAbsencePolicy(),
                draft.publishedAt(),
                draft.unpublishedAt(),
                draft.version(),
                draft.createdAt(),
                draft.updatedAt(),
                draft.createdBy(),
                draft.updatedBy()
        ));
    }

    private ProductFixture createProductFixture(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        String compact = compactToken(suffix);
        long categoryId = createCategory(adminToken, compact);
        long unitId = createUnit(adminToken, compact);
        long productId = createProduct(adminToken, categoryId, unitId, compact, salePrice);

        onlineCategoryRepositoryPort.save(new com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory(
                null,
                null,
                "Online Cat Storefront " + suffix,
                "online-cat-storefront-" + suffix,
                "Categoria storefront",
                true,
                null,
                null,
                "it",
                "it"
        ));

        return new ProductFixture(
                productId,
                categoryId,
                unitId,
                "SKU-IT-" + compact,
                "BC-IT-" + compact,
                "Producto IT " + compact,
                salePrice,
                "slug-storefront-" + suffix
        );
    }

    private String compactToken(String value) {
        String hash = Long.toString(Integer.toUnsignedLong(value.hashCode()), 36);
        String normalized = value.replaceAll("[^A-Za-z0-9]", "");
        if (normalized.isBlank()) {
            return hash;
        }
        String tail = normalized.length() <= 4 ? normalized : normalized.substring(normalized.length() - 4);
        return hash + tail;
    }

    private JsonNode findBySlug(JsonNode items, String slug) {
        for (JsonNode item : items) {
            if (slug.equals(item.path("slug").asText())) {
                return item;
            }
        }
        return null;
    }

    private void deactivateProduct(String adminToken, ProductFixture product) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sku", product.sku());
        payload.put("barcode", product.barcode());
        payload.put("name", product.name());
        payload.put("description", "Producto controlado BT-009");
        payload.put("categoryId", product.categoryId());
        payload.put("unitId", product.unitId());
        payload.put("salePrice", product.salePrice());
        payload.put("active", false);

        mockMvc.perform(put("/api/v1/products/{id}", product.productId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }

    private record ProductFixture(
            long productId,
            long categoryId,
            long unitId,
            String sku,
            String barcode,
            String name,
            BigDecimal salePrice,
            String slug
    ) {
    }
}
