package com.erppos.backend.erp.ecommerce;

import com.erppos.backend.erp.ecommerce.application.service.AuditUserProvider;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceCatalogApplicationService;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceImageStorageProperties;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceProductImageBinaryService;
import com.erppos.backend.erp.ecommerce.application.service.PublicImageUrlPolicy;
import com.erppos.backend.erp.ecommerce.application.service.PublicImageUrlProperties;
import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EffectiveOnlinePriceResult;
import com.erppos.backend.erp.ecommerce.application.usecase.PublicationValidationResult;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UploadPrimaryProductAssetCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertOnlinePriceOverrideCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductAssetCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductSeoMetadataCommand;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceConflictException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceCatalogProductSnapshot;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceBrandRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceCatalogProductReadPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceImageStoragePort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceSeoMetadataRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.OnlinePriceOverrideRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileSearchCriteria;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EcommerceCatalogApplicationServiceTest {
    private InMemoryProductOnlineProfileRepository profileRepository;
    private InMemoryProductReadPort productReadPort;
    private InMemoryBrandRepository brandRepository;
    private InMemoryOnlineCategoryRepository categoryRepository;
    private InMemorySeoMetadataRepository seoRepository;
    private InMemoryProductAssetRepository assetRepository;
    private InMemoryOnlinePriceOverrideRepository overrideRepository;
    private InMemoryImageStoragePort imageStoragePort;
    private EcommerceImageStorageProperties imageStorageProperties;
    private EcommerceCatalogApplicationService service;

    @BeforeEach
    void setUp() {
        profileRepository = new InMemoryProductOnlineProfileRepository();
        productReadPort = new InMemoryProductReadPort();
        brandRepository = new InMemoryBrandRepository();
        categoryRepository = new InMemoryOnlineCategoryRepository();
        seoRepository = new InMemorySeoMetadataRepository();
        assetRepository = new InMemoryProductAssetRepository();
        overrideRepository = new InMemoryOnlinePriceOverrideRepository();
        imageStoragePort = new InMemoryImageStoragePort("https://cdn.inktoy.pe");
        imageStorageProperties = imageStorageProperties();
        service = new EcommerceCatalogApplicationService(
                profileRepository,
                productReadPort,
                brandRepository,
                categoryRepository,
                seoRepository,
                assetRepository,
                overrideRepository,
                new AuditUserProvider(),
                publicImageUrlPolicy(List.of("cdn.inktoy.pe")),
                new EcommerceProductImageBinaryService(imageStoragePort, imageStorageProperties, publicImageUrlPolicy(List.of("cdn.inktoy.pe")))
        );
    }

    @Test
    void shouldCreateDraftProfileForExistingProduct() {
        productReadPort.add(new EcommerceCatalogProductSnapshot(10L, "SKU-10", "Lapiz", BigDecimal.TEN, true));

        ProductOnlineProfile profile = service.createDraftProfile(new CreateProductOnlineProfileCommand(10L));

        assertNotNull(profile.id());
        assertEquals(OnlinePublicationStatus.DRAFT, profile.publicationStatus());
    }

    @Test
    void shouldBlockSlugChangeWhenAlreadyPublished() {
        PreparedData data = prepareValidDraftProfile();
        service.publish(data.productId());

        assertThrows(EcommerceConflictException.class, () -> service.updateProfile(
                new UpdateProductOnlineProfileCommand(
                        data.productId(),
                        "nuevo-slug-publicado",
                        "Lapicero online",
                        "Descripcion online completa",
                        data.categoryId(),
                        data.brandId(),
                        null
                )
        ));
    }

    @Test
    void shouldPublishWhenProfileHasAllRules() {
        PreparedData data = prepareValidDraftProfile();

        ProductOnlineProfile published = service.publish(data.productId());

        assertEquals(OnlinePublicationStatus.PUBLISHED, published.publicationStatus());
        assertNotNull(published.publishedAt());
    }

    @Test
    void shouldBlockPublicationForInactiveProduct() {
        PreparedData data = prepareValidDraftProfile();
        productReadPort.add(new EcommerceCatalogProductSnapshot(data.productId(), "SKU-OK", "Lapicero", BigDecimal.TEN, false));

        PublicationValidationResult result = service.validatePublication(data.productId());

        assertFalse(result.publishable());
        assertTrue(result.errors().stream().anyMatch(msg -> msg.contains("active")));
    }

    @Test
    void shouldBlockPublicationForMissingSku() {
        PreparedData data = prepareValidDraftProfile();
        productReadPort.add(new EcommerceCatalogProductSnapshot(data.productId(), "   ", "Lapicero", BigDecimal.TEN, true));

        PublicationValidationResult result = service.validatePublication(data.productId());

        assertFalse(result.publishable());
        assertTrue(result.errors().stream().anyMatch(msg -> msg.contains("SKU")));
    }

    @Test
    void shouldBlockPublicationForMissingAssetAltOrRights() {
        PreparedData data = prepareValidDraftProfile();
        service.upsertPrimaryProductAsset(new UpsertProductAssetCommand(
                data.productId(),
                AssetType.PRODUCT_IMAGE,
                "/images/products/p.jpg",
                null,
                AssetSource.SUPPLIER,
                false,
                0
        ));

        PublicationValidationResult result = service.validatePublication(data.productId());

        assertFalse(result.publishable());
        assertTrue(result.errors().stream().anyMatch(msg -> msg.contains("altText")));
        assertTrue(result.errors().stream().anyMatch(msg -> msg.contains("rights")));
    }

    @Test
    void shouldBlockPublicationForMissingPrimaryAsset() {
        PreparedData data = prepareBaseDraftProfile();
        service.updateProfile(new UpdateProductOnlineProfileCommand(
                data.productId(),
                "lapicero-online",
                "Lapicero online",
                "Descripcion online completa",
                data.categoryId(),
                data.brandId(),
                null
        ));
        service.upsertSeoMetadata(new UpsertProductSeoMetadataCommand(
                data.productId(),
                "Lapicero online | InkToy",
                "Compra lapicero online con envio rapido",
                "/productos/lapicero-online",
                RobotsPolicy.INDEX_FOLLOW,
                true,
                null,
                null,
                null
        ));

        PublicationValidationResult result = service.validatePublication(data.productId());

        assertFalse(result.publishable());
        assertTrue(result.errors().stream().anyMatch(msg -> msg.contains("Active primary asset")));
    }

    @Test
    void shouldBlockPublicationForStoredNonProductAssetType() {
        PreparedData data = prepareValidDraftProfile();
        ProductOnlineProfile profile = service.getProfileByProductId(data.productId());
        assetRepository.save(new ProductAsset(
                null,
                profile.id(),
                AssetType.BRAND_LOGO,
                "/images/products/logo.jpg",
                "Logo",
                AssetSource.OWN,
                true,
                true,
                true,
                0,
                null,
                null,
                "it",
                "it"
        ));

        PublicationValidationResult result = service.validatePublication(data.productId());

        assertFalse(result.publishable());
        assertTrue(result.errors().stream().anyMatch(msg -> msg.contains("PRODUCT_IMAGE")));
    }

    @Test
    void shouldRejectNonProductAssetTypesForProductProfile() {
        PreparedData data = prepareBaseDraftProfile();

        assertThrows(EcommerceBusinessRuleException.class, () -> service.upsertPrimaryProductAsset(
                new UpsertProductAssetCommand(
                        data.productId(),
                        AssetType.BRAND_LOGO,
                        "/images/products/logo.jpg",
                        "Logo",
                        AssetSource.SUPPLIER,
                        true,
                        0
                )
        ));
    }

    @Test
    void shouldAcceptHttpsAssetUrlWhenDomainIsAllowed() {
        PreparedData data = prepareBaseDraftProfile();

        ProductAsset asset = service.upsertPrimaryProductAsset(validAssetCommand(
                data.productId(),
                "https://cdn.inktoy.pe/products/lapicero.jpg"
        ));

        assertEquals("https://cdn.inktoy.pe/products/lapicero.jpg", asset.assetUrl());
    }

    @Test
    void shouldRejectBlankAssetUrl() {
        PreparedData data = prepareBaseDraftProfile();

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "   ")));

        assertTrue(ex.getMessage().contains("required"));
    }

    @Test
    void shouldRejectLocalhostAssetUrl() {
        PreparedData data = prepareBaseDraftProfile();

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "https://localhost/product.jpg")));

        assertTrue(ex.getMessage().contains("localhost"));
    }

    @Test
    void shouldRejectLoopbackIpAssetUrl() {
        PreparedData data = prepareBaseDraftProfile();

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "https://127.0.0.1/product.jpg")));

        assertTrue(ex.getMessage().contains("localhost"));
    }

    @Test
    void shouldRejectPrivateIpAssetUrl() {
        PreparedData data = prepareBaseDraftProfile();

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "https://192.168.1.10/product.jpg")));

        assertTrue(ex.getMessage().contains("no permitido"));
    }

    @Test
    void shouldRejectExampleTestAssetUrl() {
        PreparedData data = prepareBaseDraftProfile();

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "https://cdn.example.test/product.jpg")));

        assertTrue(ex.getMessage().contains("test"));
    }

    @Test
    void shouldRejectTestDomainAssetUrl() {
        PreparedData data = prepareBaseDraftProfile();

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "https://images.inktoy.test/product.jpg")));

        assertTrue(ex.getMessage().contains("test"));
    }

    @Test
    void shouldRejectUnsupportedAssetUrlSchemes() {
        PreparedData data = prepareBaseDraftProfile();

        assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "file:///tmp/product.jpg")));
        assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "data:image/png;base64,abc")));
        assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "ftp://cdn.inktoy.pe/product.jpg")));
    }

    @Test
    void shouldRejectAssetUrlWithCredentials() {
        PreparedData data = prepareBaseDraftProfile();

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "https://user:pass@cdn.inktoy.pe/product.jpg")));

        assertTrue(ex.getMessage().contains("no permitido"));
    }

    @Test
    void shouldRejectHttpsAssetUrlWhenAllowlistIsEmpty() {
        PreparedData data = prepareBaseDraftProfile();
        PublicImageUrlProperties properties = new PublicImageUrlProperties();
        EcommerceCatalogApplicationService restrictedService = new EcommerceCatalogApplicationService(
                profileRepository,
                productReadPort,
                brandRepository,
                categoryRepository,
                seoRepository,
                assetRepository,
                overrideRepository,
                new AuditUserProvider(),
                new PublicImageUrlPolicy(properties),
                new EcommerceProductImageBinaryService(imageStoragePort, imageStorageProperties, new PublicImageUrlPolicy(properties))
        );

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                restrictedService.upsertPrimaryProductAsset(validAssetCommand(data.productId(), "https://cdn.inktoy.pe/product.jpg")));

        assertTrue(ex.getMessage().contains("no permitido"));
    }

    @Test
    void shouldBlockPublicationForStoredInvalidAssetUrl() {
        PreparedData data = prepareValidDraftProfile();
        ProductOnlineProfile profile = service.getProfileByProductId(data.productId());
        assetRepository.save(new ProductAsset(
                null,
                profile.id(),
                AssetType.PRODUCT_IMAGE,
                "https://cdn.example.test/product.jpg",
                "Lapicero azul",
                AssetSource.OWN,
                true,
                true,
                true,
                0,
                null,
                null,
                "it",
                "it"
        ));

        PublicationValidationResult result = service.validatePublication(data.productId());

        assertFalse(result.publishable());
        assertTrue(result.errors().stream().anyMatch(msg -> msg.contains("test")));
        assertTrue(result.missingRequirements().contains(com.erppos.backend.erp.ecommerce.application.usecase.MissingRequirement.ASSET_INVALID));
    }

    @Test
    void shouldUploadPrimaryProductImageAndStoreMetadata() throws IOException {
        PreparedData data = prepareBaseDraftProfile();
        byte[] imageBytes = pngImageBytes(2, 3);

        ProductAsset asset = service.uploadPrimaryProductAsset(new UploadPrimaryProductAssetCommand(
                data.productId(),
                imageBytes,
                "lapicero-azul.png",
                "image/png",
                "Lapicero azul",
                AssetSource.OWN,
                true,
                4
        ));

        assertEquals("S3", asset.storageProvider());
        assertEquals("inktoy-test-bucket", asset.storageBucket());
        assertEquals("image/png", asset.mimeType());
        assertEquals(2, asset.width());
        assertEquals(3, asset.height());
        assertEquals(imageBytes.length, asset.sizeBytes());
        assertEquals(64, asset.checksumSha256().length());
        assertEquals("lapicero-azul.png", asset.originalFilename());
        assertTrue(asset.storageKey().startsWith("inktoy-dev/ecommerce/products/"));
        assertTrue(asset.assetUrl().startsWith("https://cdn.inktoy.pe/inktoy-dev/ecommerce/products/"));
        assertEquals(imageBytes.length, imageStoragePort.lastObject().sizeBytes());
    }

    @Test
    void shouldUploadWebpPrimaryProductImageAndStoreMetadata() {
        PreparedData data = prepareBaseDraftProfile();
        byte[] imageBytes = webpVp8xBytes(2, 3);

        ProductAsset asset = service.uploadPrimaryProductAsset(new UploadPrimaryProductAssetCommand(
                data.productId(),
                imageBytes,
                "lapicero-azul.webp",
                "image/webp",
                "Lapicero azul",
                AssetSource.OWN,
                true,
                4
        ));

        assertEquals("S3", asset.storageProvider());
        assertEquals("inktoy-test-bucket", asset.storageBucket());
        assertEquals("image/webp", asset.mimeType());
        assertEquals(2, asset.width());
        assertEquals(3, asset.height());
        assertEquals(imageBytes.length, asset.sizeBytes());
        assertEquals(64, asset.checksumSha256().length());
        assertEquals("lapicero-azul.webp", asset.originalFilename());
        assertTrue(asset.storageKey().startsWith("inktoy-dev/ecommerce/products/"));
        assertTrue(asset.storageKey().endsWith(".webp"));
        assertTrue(asset.assetUrl().startsWith("https://cdn.inktoy.pe/inktoy-dev/ecommerce/products/"));
        assertEquals("image/webp", imageStoragePort.lastObject().mimeType());
        assertEquals(imageBytes.length, imageStoragePort.lastObject().sizeBytes());
    }

    @Test
    void shouldRejectWebpProductImageUploadWithIncorrectDeclaredMimeType() {
        PreparedData data = prepareBaseDraftProfile();
        byte[] imageBytes = webpVp8Bytes(2, 3);

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.uploadPrimaryProductAsset(new UploadPrimaryProductAssetCommand(
                        data.productId(),
                        imageBytes,
                        "product.webp",
                        "image/png",
                        "WebP",
                        AssetSource.OWN,
                        true,
                        0
                )));

        assertEquals("Image content type does not match file content", ex.getMessage());
    }

    @Test
    void shouldRejectSvgProductImageUpload() {
        PreparedData data = prepareBaseDraftProfile();
        byte[] svgBytes = "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".getBytes(java.nio.charset.StandardCharsets.UTF_8);

        EcommerceBusinessRuleException ex = assertThrows(EcommerceBusinessRuleException.class, () ->
                service.uploadPrimaryProductAsset(new UploadPrimaryProductAssetCommand(
                        data.productId(),
                        svgBytes,
                        "product.svg",
                        "image/svg+xml",
                        "Vector",
                        AssetSource.OWN,
                        true,
                        0
                )));

        assertTrue(ex.getMessage().contains("JPEG, PNG and WebP") || ex.getMessage().contains(".jpg"));
    }

    @Test
    void shouldRejectIndexableSeoWithNoindexRobots() {
        PreparedData data = prepareBaseDraftProfile();

        assertThrows(EcommerceBusinessRuleException.class, () -> service.upsertSeoMetadata(
                new UpsertProductSeoMetadataCommand(
                        data.productId(),
                        "Titulo",
                        "Descripcion",
                        "/productos/lapicero",
                        RobotsPolicy.NOINDEX_FOLLOW,
                        true,
                        null,
                        null,
                        null
                )
        ));
    }

    @Test
    void shouldCalculateEffectivePriceFromOverrideWhenActiveAndValid() {
        PreparedData data = prepareBaseDraftProfile();
        service.upsertOnlinePriceOverride(new UpsertOnlinePriceOverrideCommand(
                data.productId(),
                BigDecimal.valueOf(8.90),
                "PEN",
                true,
                Instant.now().minusSeconds(60),
                Instant.now().plusSeconds(3600),
                "Promo"
        ));

        EffectiveOnlinePriceResult result = service.calculateEffectiveOnlinePrice(data.productId());

        assertTrue(result.overrideApplied());
        assertEquals(BigDecimal.valueOf(8.90), result.amount());
    }

    @Test
    void shouldCalculateEffectivePriceFromSalePriceWhenOverrideInactive() {
        PreparedData data = prepareBaseDraftProfile();
        service.upsertOnlinePriceOverride(new UpsertOnlinePriceOverrideCommand(
                data.productId(),
                BigDecimal.valueOf(8.50),
                "PEN",
                false,
                null,
                null,
                "Temporal"
        ));

        EffectiveOnlinePriceResult result = service.calculateEffectiveOnlinePrice(data.productId());

        assertFalse(result.overrideApplied());
        assertEquals(BigDecimal.TEN, result.amount());
    }

    @Test
    void shouldCalculateEffectivePriceFromSalePriceWhenOverrideExpired() {
        PreparedData data = prepareBaseDraftProfile();
        service.upsertOnlinePriceOverride(new UpsertOnlinePriceOverrideCommand(
                data.productId(),
                BigDecimal.valueOf(8.50),
                "PEN",
                true,
                Instant.now().minusSeconds(3600),
                Instant.now().minusSeconds(60),
                "Vencido"
        ));

        EffectiveOnlinePriceResult result = service.calculateEffectiveOnlinePrice(data.productId());

        assertFalse(result.overrideApplied());
        assertEquals(BigDecimal.TEN, result.amount());
    }

    @Test
    void shouldAllowUnpublishWithoutRemovingData() {
        PreparedData data = prepareValidDraftProfile();
        service.publish(data.productId());

        ProductOnlineProfile unpublished = service.unpublish(data.productId());

        assertEquals(OnlinePublicationStatus.UNPUBLISHED, unpublished.publicationStatus());
        assertNotNull(unpublished.unpublishedAt());
        assertEquals("lapicero-online", unpublished.slug());
    }

    @Test
    void shouldRejectUpdateThatMakesPublishedProfileIncomplete() {
        PreparedData data = prepareValidDraftProfile();
        service.publish(data.productId());
        ProductOnlineProfile before = service.getProfileByProductId(data.productId());

        assertThrows(EcommerceBusinessRuleException.class, () -> service.updateProfile(
                new UpdateProductOnlineProfileCommand(
                        data.productId(),
                        "lapicero-online",
                        null,
                        "Descripcion online completa",
                        null,
                        null,
                        null
                )
        ));

        ProductOnlineProfile after = service.getProfileByProductId(data.productId());
        assertEquals(OnlinePublicationStatus.PUBLISHED, after.publicationStatus());
        assertEquals(before.onlineName(), after.onlineName());
        assertEquals(before.onlineCategoryId(), after.onlineCategoryId());
        assertEquals(before.brandId(), after.brandId());
    }

    @Test
    void shouldRejectProfileCreateForMissingProduct() {
        assertThrows(EcommerceNotFoundException.class,
                () -> service.createDraftProfile(new CreateProductOnlineProfileCommand(999L)));
    }

    private PreparedData prepareValidDraftProfile() {
        PreparedData data = prepareBaseDraftProfile();
        service.updateProfile(new UpdateProductOnlineProfileCommand(
                data.productId(),
                "Lápicero Online",
                "Lapicero online",
                "Descripcion online completa",
                data.categoryId(),
                data.brandId(),
                null
        ));

        service.upsertPrimaryProductAsset(new UpsertProductAssetCommand(
                data.productId(),
                AssetType.PRODUCT_IMAGE,
                "/images/products/p.jpg",
                "Lapicero azul",
                AssetSource.SUPPLIER,
                true,
                0
        ));

        service.upsertSeoMetadata(new UpsertProductSeoMetadataCommand(
                data.productId(),
                "Lapicero online | InkToy",
                "Compra lapicero online con envio rapido",
                "/productos/lapicero-online",
                RobotsPolicy.INDEX_FOLLOW,
                true,
                null,
                null,
                null
        ));

        return data;
    }

    private PreparedData prepareBaseDraftProfile() {
        long productId = 10L;
        long brandId = 20L;
        long categoryId = 30L;

        productReadPort.add(new EcommerceCatalogProductSnapshot(productId, "SKU-OK", "Lapicero", BigDecimal.TEN, true));
        brandRepository.save(new EcommerceBrand(brandId, "Faber", "faber", null, true, null, null, "it", "it"));
        categoryRepository.save(new EcommerceOnlineCategory(categoryId, null, "Utiles", "utiles", null, true, null, null, "it", "it"));
        service.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        return new PreparedData(productId, brandId, categoryId);
    }

    private UpsertProductAssetCommand validAssetCommand(Long productId, String assetUrl) {
        return new UpsertProductAssetCommand(
                productId,
                AssetType.PRODUCT_IMAGE,
                assetUrl,
                "Lapicero azul",
                AssetSource.OWN,
                true,
                0
        );
    }

    private PublicImageUrlPolicy publicImageUrlPolicy(List<String> allowedDomains) {
        PublicImageUrlProperties properties = new PublicImageUrlProperties();
        properties.setAllowedDomains(allowedDomains);
        return new PublicImageUrlPolicy(properties);
    }

    private EcommerceImageStorageProperties imageStorageProperties() {
        EcommerceImageStorageProperties properties = new EcommerceImageStorageProperties();
        properties.setProvider("s3");
        properties.setBucket("inktoy-test-bucket");
        properties.setPrefix("inktoy-dev");
        properties.setPublicBaseUrl("https://cdn.inktoy.pe");
        properties.setMaxSizeBytes(1024 * 1024);
        properties.setMaxWidth(1000);
        properties.setMaxHeight(1000);
        return properties;
    }

    private byte[] pngImageBytes(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    private byte[] webpVp8Bytes(int width, int height) {
        byte[] data = new byte[10];
        data[3] = (byte) 0x9D;
        data[4] = 0x01;
        data[5] = 0x2A;
        writeShortLittleEndian(data, 6, width);
        writeShortLittleEndian(data, 8, height);
        return riffWebpChunk("VP8 ", data);
    }

    private byte[] webpVp8lData(int width, int height) {
        int packedDimensions = ((height - 1) << 14) | (width - 1);
        byte[] data = new byte[5];
        data[0] = 0x2F;
        writeIntLittleEndian(data, 1, packedDimensions);
        return data;
    }

    private byte[] webpVp8xBytes(int width, int height) {
        byte[] data = new byte[10];
        write24LittleEndian(data, 4, width - 1);
        write24LittleEndian(data, 7, height - 1);
        return riffWebpChunks(new WebpChunk("VP8X", data), new WebpChunk("VP8L", webpVp8lData(width, height)));
    }

    private byte[] riffWebpChunk(String fourCc, byte[] data) {
        return riffWebpChunks(new WebpChunk(fourCc, data));
    }

    private byte[] riffWebpChunks(WebpChunk... chunks) {
        int chunksSize = 0;
        for (WebpChunk chunk : chunks) {
            chunksSize += 8 + chunk.data().length + (chunk.data().length % 2);
        }
        int riffSize = 4 + chunksSize;
        byte[] bytes = new byte[8 + riffSize];
        writeFourCc(bytes, 0, "RIFF");
        writeIntLittleEndian(bytes, 4, riffSize);
        writeFourCc(bytes, 8, "WEBP");
        int offset = 12;
        for (WebpChunk chunk : chunks) {
            writeFourCc(bytes, offset, chunk.fourCc());
            writeIntLittleEndian(bytes, offset + 4, chunk.data().length);
            System.arraycopy(chunk.data(), 0, bytes, offset + 8, chunk.data().length);
            offset += 8 + chunk.data().length + (chunk.data().length % 2);
        }
        return bytes;
    }

    private void writeFourCc(byte[] bytes, int offset, String value) {
        for (int index = 0; index < value.length(); index++) {
            bytes[offset + index] = (byte) value.charAt(index);
        }
    }

    private void writeIntLittleEndian(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) value;
        bytes[offset + 1] = (byte) (value >> 8);
        bytes[offset + 2] = (byte) (value >> 16);
        bytes[offset + 3] = (byte) (value >> 24);
    }

    private void writeShortLittleEndian(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) value;
        bytes[offset + 1] = (byte) (value >> 8);
    }

    private void write24LittleEndian(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) value;
        bytes[offset + 1] = (byte) (value >> 8);
        bytes[offset + 2] = (byte) (value >> 16);
    }

    private record PreparedData(Long productId, Long brandId, Long categoryId) {
    }

    private record WebpChunk(String fourCc, byte[] data) {
    }

    private static final class InMemoryProductReadPort implements EcommerceCatalogProductReadPort {
        private final Map<Long, EcommerceCatalogProductSnapshot> products = new HashMap<>();

        void add(EcommerceCatalogProductSnapshot product) {
            products.put(product.id(), product);
        }

        @Override
        public Optional<EcommerceCatalogProductSnapshot> findById(Long productId) {
            return Optional.ofNullable(products.get(productId));
        }

        @Override
        public List<EcommerceCatalogProductSnapshot> findByIds(List<Long> productIds) {
            if (productIds == null || productIds.isEmpty()) {
                return List.of();
            }
            return productIds.stream()
                    .map(products::get)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        }
    }

    private static final class InMemoryProductOnlineProfileRepository implements ProductOnlineProfileRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, ProductOnlineProfile> profiles = new HashMap<>();

        @Override
        public ProductOnlineProfile save(ProductOnlineProfile profile) {
            Long id = profile.id() == null ? sequence.getAndIncrement() : profile.id();
            ProductOnlineProfile saved = new ProductOnlineProfile(
                    id,
                    profile.productId(),
                    profile.publicationStatus(),
                    profile.slug(),
                    profile.onlineName(),
                    profile.onlineDescription(),
                    profile.onlineCategoryId(),
                    profile.brandId(),
                    profile.brandAbsencePolicy(),
                    profile.publishedAt(),
                    profile.unpublishedAt(),
                    profile.version() == null ? 0L : profile.version(),
                    profile.createdAt() == null ? Instant.now() : profile.createdAt(),
                    Instant.now(),
                    profile.createdBy(),
                    profile.updatedBy()
            );
            profiles.put(id, saved);
            return saved;
        }

        @Override
        public Optional<ProductOnlineProfile> findById(Long id) {
            return Optional.ofNullable(profiles.get(id));
        }

        @Override
        public Page<ProductOnlineProfile> findAll(Pageable pageable) {
            return new PageImpl<>(profiles.values().stream().toList(), pageable, profiles.size());
        }

        @Override
        public Page<ProductOnlineProfile> findAll(ProductOnlineProfileSearchCriteria criteria, Pageable pageable) {
            List<ProductOnlineProfile> filtered = profiles.values().stream()
                    .filter(profile -> criteria == null || criteria.status() == null || profile.publicationStatus() == criteria.status())
                    .filter(profile -> criteria == null || criteria.brandId() == null || criteria.brandId().equals(profile.brandId()))
                    .filter(profile -> criteria == null || !criteria.withoutBrand() || profile.brandId() == null)
                    .filter(profile -> criteria == null || criteria.onlineCategoryId() == null || criteria.onlineCategoryId().equals(profile.onlineCategoryId()))
                    .filter(profile -> criteria == null || !criteria.withoutOnlineCategory() || profile.onlineCategoryId() == null)
                    .filter(profile -> criteria == null || criteria.query() == null || matchesQuery(profile, criteria.query()))
                    .toList();
            return new PageImpl<>(filtered, pageable, filtered.size());
        }

        private boolean matchesQuery(ProductOnlineProfile profile, String query) {
            String normalized = query.toLowerCase(java.util.Locale.ROOT);
            return (profile.onlineName() != null && profile.onlineName().toLowerCase(java.util.Locale.ROOT).contains(normalized))
                    || (profile.slug() != null && profile.slug().toLowerCase(java.util.Locale.ROOT).contains(normalized));
        }

        @Override
        public List<ProductOnlineProfile> findByProductIds(List<Long> productIds) {
            return profiles.values().stream()
                    .filter(profile -> productIds.contains(profile.productId()))
                    .toList();
        }

        @Override
        public Optional<ProductOnlineProfile> findByProductId(Long productId) {
            return profiles.values().stream().filter(profile -> profile.productId().equals(productId)).findFirst();
        }

        @Override
        public boolean existsByProductId(Long productId) {
            return findByProductId(productId).isPresent();
        }

        @Override
        public boolean existsBySlugIgnoreCase(String slug) {
            return profiles.values().stream()
                    .anyMatch(profile -> profile.slug() != null && profile.slug().equalsIgnoreCase(slug));
        }

        @Override
        public boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id) {
            return profiles.values().stream()
                    .anyMatch(profile -> profile.slug() != null
                            && profile.slug().equalsIgnoreCase(slug)
                            && !profile.id().equals(id));
        }

        @Override
        public boolean existsByBrandIdAndPublicationStatus(Long brandId, OnlinePublicationStatus publicationStatus) {
            return profiles.values().stream().anyMatch(profile -> brandId.equals(profile.brandId())
                    && publicationStatus == profile.publicationStatus());
        }

        @Override
        public boolean existsByOnlineCategoryIdAndPublicationStatus(Long onlineCategoryId, OnlinePublicationStatus publicationStatus) {
            return profiles.values().stream().anyMatch(profile -> onlineCategoryId.equals(profile.onlineCategoryId())
                    && publicationStatus == profile.publicationStatus());
        }
    }

    private static final class InMemoryBrandRepository implements EcommerceBrandRepositoryPort {
        private final Map<Long, EcommerceBrand> brands = new HashMap<>();
        private final AtomicLong sequence = new AtomicLong(1);

        @Override
        public EcommerceBrand save(EcommerceBrand brand) {
            Long id = brand.id() == null ? sequence.getAndIncrement() : brand.id();
            EcommerceBrand saved = new EcommerceBrand(
                    id,
                    brand.name(),
                    brand.slug(),
                    brand.description(),
                    brand.active(),
                    brand.createdAt(),
                    brand.updatedAt(),
                    brand.createdBy(),
                    brand.updatedBy()
            );
            brands.put(id, saved);
            return saved;
        }

        @Override
        public List<EcommerceBrand> findAll() {
            return brands.values().stream().toList();
        }

        @Override
        public Optional<EcommerceBrand> findById(Long id) {
            return Optional.ofNullable(brands.get(id));
        }

        @Override
        public Optional<EcommerceBrand> findBySlugIgnoreCase(String slug) {
            return brands.values().stream().filter(brand -> brand.slug().equalsIgnoreCase(slug)).findFirst();
        }

        @Override
        public boolean existsBySlugIgnoreCase(String slug) {
            return findBySlugIgnoreCase(slug).isPresent();
        }

        @Override
        public boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id) {
            return brands.values().stream().anyMatch(brand -> brand.slug().equalsIgnoreCase(slug)
                    && !brand.id().equals(id));
        }

        @Override
        public boolean existsByNameIgnoreCase(String name) {
            return brands.values().stream().anyMatch(brand -> brand.name().equalsIgnoreCase(name));
        }
    }

    private static final class InMemoryOnlineCategoryRepository implements EcommerceOnlineCategoryRepositoryPort {
        private final Map<Long, EcommerceOnlineCategory> categories = new HashMap<>();
        private final AtomicLong sequence = new AtomicLong(1);

        @Override
        public EcommerceOnlineCategory save(EcommerceOnlineCategory category) {
            Long id = category.id() == null ? sequence.getAndIncrement() : category.id();
            EcommerceOnlineCategory saved = new EcommerceOnlineCategory(
                    id,
                    category.parentId(),
                    category.name(),
                    category.slug(),
                    category.description(),
                    category.active(),
                    category.createdAt(),
                    category.updatedAt(),
                    category.createdBy(),
                    category.updatedBy()
            );
            categories.put(id, saved);
            return saved;
        }

        @Override
        public List<EcommerceOnlineCategory> findAll() {
            return categories.values().stream().toList();
        }

        @Override
        public Optional<EcommerceOnlineCategory> findById(Long id) {
            return Optional.ofNullable(categories.get(id));
        }

        @Override
        public Optional<EcommerceOnlineCategory> findBySlugIgnoreCase(String slug) {
            return categories.values().stream().filter(category -> category.slug().equalsIgnoreCase(slug)).findFirst();
        }

        @Override
        public boolean existsBySlugIgnoreCase(String slug) {
            return findBySlugIgnoreCase(slug).isPresent();
        }

        @Override
        public boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id) {
            return categories.values().stream().anyMatch(category -> category.slug().equalsIgnoreCase(slug)
                    && !category.id().equals(id));
        }
    }

    private static final class InMemorySeoMetadataRepository implements EcommerceSeoMetadataRepositoryPort {
        private final Map<Long, EcommerceSeoMetadata> metadataByProfile = new HashMap<>();
        private final AtomicLong sequence = new AtomicLong(1);

        @Override
        public EcommerceSeoMetadata save(EcommerceSeoMetadata metadata) {
            Long id = metadata.id() == null ? sequence.getAndIncrement() : metadata.id();
            EcommerceSeoMetadata saved = new EcommerceSeoMetadata(
                    id,
                    metadata.productOnlineProfileId(),
                    metadata.onlineCategoryId(),
                    metadata.brandId(),
                    metadata.seoTitle(),
                    metadata.seoDescription(),
                    metadata.canonicalPath(),
                    metadata.robotsPolicy(),
                    metadata.indexable(),
                    metadata.ogTitle(),
                    metadata.ogDescription(),
                    metadata.ogImageUrl(),
                    metadata.createdAt(),
                    metadata.updatedAt(),
                    metadata.createdBy(),
                    metadata.updatedBy()
            );
            metadataByProfile.put(saved.productOnlineProfileId(), saved);
            return saved;
        }

        @Override
        public Optional<EcommerceSeoMetadata> findByProductOnlineProfileId(Long productOnlineProfileId) {
            return Optional.ofNullable(metadataByProfile.get(productOnlineProfileId));
        }

        @Override
        public Optional<EcommerceSeoMetadata> findByOnlineCategoryId(Long onlineCategoryId) {
            return Optional.empty();
        }

        @Override
        public Optional<EcommerceSeoMetadata> findByBrandId(Long brandId) {
            return Optional.empty();
        }

        @Override
        public List<EcommerceSeoMetadata> findAllByProductOnlineProfileIds(List<Long> productOnlineProfileIds) {
            if (productOnlineProfileIds == null || productOnlineProfileIds.isEmpty()) {
                return List.of();
            }
            return productOnlineProfileIds.stream()
                    .map(metadataByProfile::get)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        }
    }

    private static final class InMemoryProductAssetRepository implements ProductAssetRepositoryPort {
        private final Map<Long, ProductAsset> assetsByProfile = new HashMap<>();
        private final AtomicLong sequence = new AtomicLong(1);

        @Override
        public ProductAsset save(ProductAsset asset) {
            Long id = asset.id() == null ? sequence.getAndIncrement() : asset.id();
            ProductAsset saved = new ProductAsset(
                    id,
                    asset.productOnlineProfileId(),
                    asset.assetType(),
                    asset.assetUrl(),
                    asset.altText(),
                    asset.source(),
                    asset.rightsConfirmed(),
                    asset.primary(),
                    asset.active(),
                    asset.displayOrder(),
                    asset.storageProvider(),
                    asset.storageBucket(),
                    asset.storageKey(),
                    asset.mimeType(),
                    asset.width(),
                    asset.height(),
                    asset.sizeBytes(),
                    asset.checksumSha256(),
                    asset.originalFilename(),
                    asset.createdAt(),
                    asset.updatedAt(),
                    asset.createdBy(),
                    asset.updatedBy()
            );
            assetsByProfile.put(saved.productOnlineProfileId(), saved);
            return saved;
        }

        @Override
        public List<ProductAsset> findByProductOnlineProfileId(Long productOnlineProfileId) {
            ProductAsset asset = assetsByProfile.get(productOnlineProfileId);
            return asset == null ? List.of() : List.of(asset);
        }

        @Override
        public Optional<ProductAsset> findPrimaryActiveByProductOnlineProfileId(Long productOnlineProfileId) {
            ProductAsset asset = assetsByProfile.get(productOnlineProfileId);
            if (asset == null || !asset.primary() || !asset.active()) {
                return Optional.empty();
            }
            return Optional.of(asset);
        }

        @Override
        public List<ProductAsset> findPrimaryActiveByProductOnlineProfileIds(List<Long> productOnlineProfileIds) {
            if (productOnlineProfileIds == null || productOnlineProfileIds.isEmpty()) {
                return List.of();
            }
            return productOnlineProfileIds.stream()
                    .map(assetsByProfile::get)
                    .filter(java.util.Objects::nonNull)
                    .filter(asset -> asset.primary() && asset.active())
                    .toList();
        }
    }

    private static final class InMemoryImageStoragePort implements EcommerceImageStoragePort {
        private final String publicBaseUrl;
        private EcommerceImageStorageObject lastObject;

        private InMemoryImageStoragePort(String publicBaseUrl) {
            this.publicBaseUrl = publicBaseUrl;
        }

        @Override
        public StoredEcommerceImage store(EcommerceImageStorageObject object) {
            lastObject = object;
            return new StoredEcommerceImage(
                    "S3",
                    "inktoy-test-bucket",
                    object.storageKey(),
                    publicBaseUrl + "/" + object.storageKey()
            );
        }

        private EcommerceImageStorageObject lastObject() {
            return lastObject;
        }
    }

    private static final class InMemoryOnlinePriceOverrideRepository implements OnlinePriceOverrideRepositoryPort {
        private final Map<Long, OnlinePriceOverride> activeOverridesByProfile = new HashMap<>();
        private final AtomicLong sequence = new AtomicLong(1);

        @Override
        public OnlinePriceOverride save(OnlinePriceOverride override) {
            Long id = override.id() == null ? sequence.getAndIncrement() : override.id();
            OnlinePriceOverride saved = new OnlinePriceOverride(
                    id,
                    override.productOnlineProfileId(),
                    override.amount(),
                    override.currency(),
                    override.active(),
                    override.validFrom(),
                    override.validTo(),
                    override.reason(),
                    override.createdAt(),
                    override.updatedAt(),
                    override.createdBy(),
                    override.updatedBy()
            );
            if (saved.active()) {
                activeOverridesByProfile.put(saved.productOnlineProfileId(), saved);
            } else {
                activeOverridesByProfile.remove(saved.productOnlineProfileId());
            }
            return saved;
        }

        @Override
        public Optional<OnlinePriceOverride> findActiveByProductOnlineProfileId(Long productOnlineProfileId) {
            return Optional.ofNullable(activeOverridesByProfile.get(productOnlineProfileId));
        }

        @Override
        public List<OnlinePriceOverride> findActiveByProductOnlineProfileIds(List<Long> productOnlineProfileIds) {
            if (productOnlineProfileIds == null || productOnlineProfileIds.isEmpty()) {
                return List.of();
            }
            return productOnlineProfileIds.stream()
                    .map(activeOverridesByProfile::get)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        }
    }
}
