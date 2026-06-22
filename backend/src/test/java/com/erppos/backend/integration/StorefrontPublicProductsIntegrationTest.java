package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantFormat;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantPurpose;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantEntity;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantJpaRepository;
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

    @Autowired
    private ProductAssetRepositoryPort productAssetRepositoryPort;

    @Autowired
    private ProductAssetVariantJpaRepository productAssetVariantJpaRepository;

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
    void shouldFilterPublishedProductsByCategorySlug() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory targetCategory = createOnlineCategory("online-cat-filter-target-" + suffix, "Online Cat Filter Target " + suffix, true);
        EcommerceOnlineCategory otherCategory = createOnlineCategory("online-cat-filter-other-" + suffix, "Online Cat Filter Other " + suffix, true);
        ProductFixture targetProduct = createPublishedProfileInOnlineCategory(adminToken, suffix + "-target", BigDecimal.valueOf(31.10), null, targetCategory.id());
        ProductFixture otherProduct = createPublishedProfileInOnlineCategory(adminToken, suffix + "-other", BigDecimal.valueOf(32.20), null, otherCategory.id());

        MvcResult result = mockMvc.perform(get("/api/v1/storefront/catalog/products")
                        .param("categorySlug", targetCategory.slug())
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(50))
                .andReturn();

        JsonNode items = readJson(result).path("items");
        org.junit.jupiter.api.Assertions.assertNotNull(findBySlug(items, targetProduct.slug()));
        org.junit.jupiter.api.Assertions.assertNull(findBySlug(items, otherProduct.slug()));
        for (JsonNode item : items) {
            org.junit.jupiter.api.Assertions.assertEquals(targetCategory.slug(), item.path("category").path("slug").asText());
            org.junit.jupiter.api.Assertions.assertFalse(item.has("categoryId"));
            org.junit.jupiter.api.Assertions.assertFalse(item.has("onlineCategoryId"));
        }
    }

    @Test
    void shouldReturnEmptyPageWhenCategorySlugDoesNotExist() throws Exception {
        String suffix = String.valueOf(System.nanoTime());

        mockMvc.perform(get("/api/v1/storefront/catalog/products")
                        .param("categorySlug", "online-cat-missing-" + suffix)
                        .param("size", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.totalItems").value(0))
                .andExpect(jsonPath("$.totalPages").value(0));
    }

    @Test
    void shouldNotExposeProductsWhenOnlineCategoryIsInactive() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime());
        EcommerceOnlineCategory category = createOnlineCategory("online-cat-inactive-filter-" + suffix, "Online Cat Inactive Filter " + suffix, true);
        ProductFixture product = createPublishedProfileInOnlineCategory(adminToken, suffix + "-inactive-cat", BigDecimal.valueOf(41.30), null, category.id());

        onlineCategoryRepositoryPort.save(new EcommerceOnlineCategory(
                category.id(),
                category.parentId(),
                category.name(),
                category.slug(),
                category.description(),
                false,
                category.createdAt(),
                category.updatedAt(),
                category.createdBy(),
                "it"
        ));

        MvcResult result = mockMvc.perform(get("/api/v1/storefront/catalog/products")
                        .param("categorySlug", category.slug())
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.totalItems").value(0))
                .andReturn();

        org.junit.jupiter.api.Assertions.assertNull(findBySlug(readJson(result).path("items"), product.slug()));
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

    @Test
    void shouldPreferActivePreferredWebpVariantInListAndDetailPrimaryImageUrl() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-vpref";
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(71.00), null);
        ProductAsset asset = primaryAsset(product);
        String variantUrl = "https://cdn.inktoy.pe/ecommerce/products/variants/" + suffix + ".webp";
        saveVariant(asset.id(), suffix, variantUrl, true, true);

        JsonNode listImage = listPrimaryImage(product);
        assertPublicImage(listImage, variantUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertPublicImageContract(listImage);
        assertNoResponsiveVariants(listImage);

        JsonNode detailImage = detailPrimaryImage(product);
        assertPublicImage(detailImage, variantUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertPublicImageContract(detailImage);
        assertNoResponsiveVariants(detailImage);
    }

    @Test
    void shouldExposeResponsiveWebpVariantsInListAndDetailPrimaryImage() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-resp";
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(79.00), null);
        ProductAsset asset = primaryAsset(product);
        String optimizedUrl = "https://cdn.inktoy.pe/ecommerce/products/variants/optimized-" + suffix + ".webp";
        saveVariant(asset.id(), suffix, optimizedUrl, true, true);
        saveResponsiveVariant(asset.id(), suffix + "-640", "https://cdn.inktoy.pe/ecommerce/products/variants/" + suffix + "-640.webp", true, 640, 480, 640, 20);
        saveResponsiveVariant(asset.id(), suffix + "-320", "https://cdn.inktoy.pe/ecommerce/products/variants/" + suffix + "-320.webp", true, 320, 240, 320, 10);

        JsonNode listImage = listPrimaryImage(product);
        assertPublicImage(listImage, optimizedUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertResponsiveVariants(listImage, suffix);

        JsonNode detailImage = detailPrimaryImage(product);
        assertPublicImage(detailImage, optimizedUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertResponsiveVariants(detailImage, suffix);
    }

    @Test
    void shouldIgnoreInvalidResponsiveVariantsAndKeepPrimaryImageUrl() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-badresp";
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(80.00), null);
        ProductAsset asset = primaryAsset(product);
        saveResponsiveVariant(asset.id(), suffix + "-blank", "   ", true, 320, 240, 320, 0);
        saveResponsiveVariant(asset.id(), suffix + "-inactive", "https://cdn.inktoy.pe/ecommerce/products/variants/" + suffix + "-inactive.webp", false, 640, 480, 640, 1);

        String originalUrl = "/images/products/storefront-" + suffix + ".jpg";
        JsonNode listImage = listPrimaryImage(product);
        assertPublicImage(listImage, originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertNoResponsiveVariants(listImage);

        JsonNode detailImage = detailPrimaryImage(product);
        assertPublicImage(detailImage, originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertNoResponsiveVariants(detailImage);
    }

    @Test
    void shouldFallbackToOriginalImageUrlWhenProductHasNoVariant() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-novar";
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(72.00), null);
        String originalUrl = "/images/products/storefront-" + suffix + ".jpg";

        assertPublicImage(listPrimaryImage(product), originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertPublicImage(detailPrimaryImage(product), originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
    }

    @Test
    void shouldIgnoreInactiveWebpVariantAndReturnOriginalImageUrl() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-inactivevar";
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(73.00), null);
        ProductAsset asset = primaryAsset(product);
        saveVariant(asset.id(), suffix, "https://cdn.inktoy.pe/ecommerce/products/variants/inactive-" + suffix + ".webp", false, false);

        String originalUrl = "/images/products/storefront-" + suffix + ".jpg";
        assertPublicImage(listPrimaryImage(product), originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertPublicImage(detailPrimaryImage(product), originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
    }

    @Test
    void shouldIgnoreNonPreferredWebpVariantAndReturnOriginalImageUrl() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-nonprefvar";
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(74.00), null);
        ProductAsset asset = primaryAsset(product);
        saveVariant(asset.id(), suffix, "https://cdn.inktoy.pe/ecommerce/products/variants/nonpreferred-" + suffix + ".webp", true, false);

        String originalUrl = "/images/products/storefront-" + suffix + ".jpg";
        assertPublicImage(listPrimaryImage(product), originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertPublicImage(detailPrimaryImage(product), originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
    }

    @Test
    void shouldIgnoreVariantAssociatedToAnotherProductAsset() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-othervar";
        ProductFixture targetProduct = createPublishedProfile(adminToken, suffix + "-target", BigDecimal.valueOf(75.00), null);
        ProductFixture otherProduct = createPublishedProfile(adminToken, suffix + "-other", BigDecimal.valueOf(76.00), null);
        ProductAsset otherAsset = primaryAsset(otherProduct);
        saveVariant(otherAsset.id(), suffix, "https://cdn.inktoy.pe/ecommerce/products/variants/other-" + suffix + ".webp", true, true);

        String originalUrl = "/images/products/storefront-" + suffix + "-target.jpg";
        assertPublicImage(listPrimaryImage(targetProduct), originalUrl, "Imagen storefront " + suffix + "-target", "PRODUCT_IMAGE", 0);
        assertPublicImage(detailPrimaryImage(targetProduct), originalUrl, "Imagen storefront " + suffix + "-target", "PRODUCT_IMAGE", 0);
    }

    @Test
    void shouldIgnoreBlankVariantUrlAndReturnOriginalImageUrl() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-blankvar";
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(77.00), null);
        ProductAsset asset = primaryAsset(product);
        saveVariant(asset.id(), suffix, "   ", true, true);

        String originalUrl = "/images/products/storefront-" + suffix + ".jpg";
        assertPublicImage(listPrimaryImage(product), originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
        assertPublicImage(detailPrimaryImage(product), originalUrl, "Imagen storefront " + suffix, "PRODUCT_IMAGE", 0);
    }

    @Test
    void shouldNotReturnStaleVariantAfterUrlOnlyReplacement() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = String.valueOf(System.nanoTime()) + "-stalevar";
        ProductFixture product = createPublishedProfile(adminToken, suffix, BigDecimal.valueOf(78.00), null);
        ProductAsset asset = primaryAsset(product);
        ProductAssetVariantEntity variant = saveVariant(
                asset.id(),
                suffix,
                "https://cdn.inktoy.pe/ecommerce/products/variants/stale-" + suffix + ".webp",
                true,
                true
        );
        ProductAssetVariantEntity responsive320 = saveResponsiveVariant(
                asset.id(),
                suffix + "-320",
                "https://cdn.inktoy.pe/ecommerce/products/variants/stale-" + suffix + "-320.webp",
                true,
                320,
                240,
                320,
                0
        );
        ProductAssetVariantEntity responsive640 = saveResponsiveVariant(
                asset.id(),
                suffix + "-640",
                "https://cdn.inktoy.pe/ecommerce/products/variants/stale-" + suffix + "-640.webp",
                true,
                640,
                480,
                640,
                1
        );
        String newOriginalUrl = "/images/products/replaced-" + suffix + ".jpg";

        upsertPrimaryAsset(adminToken, product.productId(), newOriginalUrl, "Imagen reemplazada " + suffix, 1);

        ProductAssetVariantEntity currentVariant = productAssetVariantJpaRepository.findById(variant.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertFalse(currentVariant.isActive());
        org.junit.jupiter.api.Assertions.assertFalse(currentVariant.isPreferred());
        org.junit.jupiter.api.Assertions.assertFalse(productAssetVariantJpaRepository.findById(responsive320.getId()).orElseThrow().isActive());
        org.junit.jupiter.api.Assertions.assertFalse(productAssetVariantJpaRepository.findById(responsive640.getId()).orElseThrow().isActive());
        JsonNode listImage = listPrimaryImage(product);
        assertPublicImage(listImage, newOriginalUrl, "Imagen reemplazada " + suffix, "PRODUCT_IMAGE", 1);
        assertNoResponsiveVariants(listImage);
        JsonNode detailImage = detailPrimaryImage(product);
        assertPublicImage(detailImage, newOriginalUrl, "Imagen reemplazada " + suffix, "PRODUCT_IMAGE", 1);
        assertNoResponsiveVariants(detailImage);
    }

    private ProductFixture createPublishedProfile(String adminToken, String suffix, BigDecimal salePrice, BigDecimal overrideAmount) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, salePrice);

        long onlineCategoryId = onlineCategoryRepositoryPort.findAll().stream()
                .filter(cat -> cat.slug().equals("online-cat-storefront-" + suffix))
                .map(cat -> cat.id())
                .findFirst()
                .orElseThrow();

        publishProductOnlineProfile(adminToken, suffix, product, onlineCategoryId, overrideAmount);
        return product;
    }

    private ProductFixture createPublishedProfileInOnlineCategory(
            String adminToken,
            String suffix,
            BigDecimal salePrice,
            BigDecimal overrideAmount,
            long onlineCategoryId
    ) throws Exception {
        ProductFixture product = createProductFixture(adminToken, suffix, salePrice);
        publishProductOnlineProfile(adminToken, suffix, product, onlineCategoryId, overrideAmount);
        return product;
    }

    private void publishProductOnlineProfile(
            String adminToken,
            String suffix,
            ProductFixture product,
            long onlineCategoryId,
            BigDecimal overrideAmount
    ) throws Exception {
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(product.productId()));

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

        upsertPrimaryAsset(adminToken, product.productId(), "/images/products/storefront-" + suffix + ".jpg", "Imagen storefront " + suffix, 0);

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
    }

    private EcommerceOnlineCategory createOnlineCategory(String slug, String name, boolean active) {
        return onlineCategoryRepositoryPort.save(new EcommerceOnlineCategory(
                null,
                null,
                name,
                slug,
                "Categoria storefront",
                active,
                null,
                null,
                "it",
                "it"
        ));
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

    private JsonNode listPrimaryImage(ProductFixture product) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/storefront/catalog/products").param("size", "50"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode target = findBySlug(readJson(result).path("items"), product.slug());
        org.junit.jupiter.api.Assertions.assertNotNull(target);
        return target.path("primaryImage");
    }

    private JsonNode detailPrimaryImage(ProductFixture product) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/storefront/catalog/products/{slug}", product.slug()))
                .andExpect(status().isOk())
                .andReturn();
        return readJson(result).path("primaryImage");
    }

    private void assertPublicImage(JsonNode image, String url, String altText, String type, int displayOrder) {
        org.junit.jupiter.api.Assertions.assertEquals(url, image.path("url").asText());
        org.junit.jupiter.api.Assertions.assertEquals(altText, image.path("altText").asText());
        org.junit.jupiter.api.Assertions.assertEquals(type, image.path("type").asText());
        org.junit.jupiter.api.Assertions.assertEquals(displayOrder, image.path("displayOrder").asInt());
    }

    private void assertPublicImageContract(JsonNode image) {
        org.junit.jupiter.api.Assertions.assertTrue(image.has("url"));
        org.junit.jupiter.api.Assertions.assertTrue(image.has("altText"));
        org.junit.jupiter.api.Assertions.assertTrue(image.has("type"));
        org.junit.jupiter.api.Assertions.assertTrue(image.has("displayOrder"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("variants"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("mimeType"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("width"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("height"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("sizes"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("srcset"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("srcSet"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("sources"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("metadata"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("productAssetId"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("storageKey"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("storageProvider"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("storageBucket"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("checksumSha256"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("sourceChecksumSha256"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("active"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("preferred"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("variantKind"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("purpose"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("sortOrder"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("createdAt"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("updatedAt"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("createdBy"));
        org.junit.jupiter.api.Assertions.assertFalse(image.has("updatedBy"));
    }

    private void assertNoResponsiveVariants(JsonNode image) {
        assertPublicImageContract(image);
        org.junit.jupiter.api.Assertions.assertTrue(
                !image.has("responsive") || image.path("responsive").isNull()
        );
    }

    private void assertResponsiveVariants(JsonNode image, String suffix) {
        assertPublicImageContract(image);
        JsonNode variants = image.path("responsive").path("variants");
        org.junit.jupiter.api.Assertions.assertTrue(variants.isArray());
        org.junit.jupiter.api.Assertions.assertEquals(2, variants.size());
        assertResponsiveVariant(variants.get(0), "https://cdn.inktoy.pe/ecommerce/products/variants/" + suffix + "-320.webp", 320, 240);
        assertResponsiveVariant(variants.get(1), "https://cdn.inktoy.pe/ecommerce/products/variants/" + suffix + "-640.webp", 640, 480);
    }

    private void assertResponsiveVariant(JsonNode variant, String url, int width, int height) {
        org.junit.jupiter.api.Assertions.assertEquals(url, variant.path("url").asText());
        org.junit.jupiter.api.Assertions.assertEquals("image/webp", variant.path("mimeType").asText());
        org.junit.jupiter.api.Assertions.assertEquals(width, variant.path("width").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(height, variant.path("height").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(4, variant.size());
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("productAssetId"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("storageKey"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("storageProvider"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("storageBucket"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("checksumSha256"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("sourceChecksumSha256"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("active"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("preferred"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("variantKind"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("purpose"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("sortOrder"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("createdAt"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("updatedAt"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("createdBy"));
        org.junit.jupiter.api.Assertions.assertFalse(variant.has("updatedBy"));
    }

    private ProductAsset primaryAsset(ProductFixture product) {
        ProductOnlineProfile profile = productOnlineProfileRepositoryPort.findByProductId(product.productId()).orElseThrow();
        return productAssetRepositoryPort.findPrimaryActiveByProductOnlineProfileId(profile.id()).orElseThrow();
    }

    private ProductAssetVariantEntity saveVariant(Long productAssetId, String keySuffix, String assetUrl, boolean active, boolean preferred) {
        ProductAssetVariantEntity variant = new ProductAssetVariantEntity();
        variant.setProductAssetId(productAssetId);
        variant.setVariantKind(ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP);
        variant.setFormat(ProductAssetVariantFormat.WEBP);
        variant.setPurpose(ProductAssetVariantPurpose.PRIMARY);
        variant.setTargetWidth(96);
        variant.setSortOrder(0);
        variant.setAssetUrl(assetUrl);
        variant.setStorageProvider("S3");
        variant.setStorageBucket("inktoy-test-bucket");
        variant.setStorageKey("ecommerce/products/assets/" + productAssetId + "/variants/" + keySuffix + ".webp");
        variant.setMimeType("image/webp");
        variant.setWidth(96);
        variant.setHeight(72);
        variant.setSizeBytes(762L);
        variant.setChecksumSha256("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        variant.setSourceChecksumSha256("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789");
        variant.setActive(active);
        variant.setPreferred(preferred);
        variant.setCreatedBy("it");
        variant.setUpdatedBy("it");
        return productAssetVariantJpaRepository.saveAndFlush(variant);
    }

    private ProductAssetVariantEntity saveResponsiveVariant(
            Long productAssetId,
            String keySuffix,
            String assetUrl,
            boolean active,
            int width,
            int height,
            int targetWidth,
            int sortOrder
    ) {
        ProductAssetVariantEntity variant = new ProductAssetVariantEntity();
        variant.setProductAssetId(productAssetId);
        variant.setVariantKind(ProductAssetVariantKind.PRIMARY_RESPONSIVE_WEBP);
        variant.setFormat(ProductAssetVariantFormat.WEBP);
        variant.setPurpose(ProductAssetVariantPurpose.RESPONSIVE);
        variant.setTargetWidth(targetWidth);
        variant.setSortOrder(sortOrder);
        variant.setAssetUrl(assetUrl);
        variant.setStorageProvider("S3");
        variant.setStorageBucket("inktoy-test-bucket");
        variant.setStorageKey("ecommerce/products/assets/" + productAssetId + "/responsive/" + keySuffix + ".webp");
        variant.setMimeType("image/webp");
        variant.setWidth(width);
        variant.setHeight(height);
        variant.setSizeBytes(1024L);
        variant.setChecksumSha256("123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0");
        variant.setSourceChecksumSha256("fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210");
        variant.setActive(active);
        variant.setPreferred(false);
        variant.setCreatedBy("it");
        variant.setUpdatedBy("it");
        return productAssetVariantJpaRepository.saveAndFlush(variant);
    }

    private void upsertPrimaryAsset(String adminToken, long productId, String assetUrl, String altText, int displayOrder) throws Exception {
        ObjectNode assetPayload = objectMapper.createObjectNode();
        assetPayload.put("assetType", "PRODUCT_IMAGE");
        assetPayload.put("assetUrl", assetUrl);
        assetPayload.put("altText", altText);
        assetPayload.put("source", "OWN");
        assetPayload.put("rightsConfirmed", true);
        assetPayload.put("displayOrder", displayOrder);

        mockMvc.perform(put("/api/v1/ecommerce-admin/products/{productId}/primary-asset", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assetPayload.toString()))
                .andExpect(status().isOk());
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
