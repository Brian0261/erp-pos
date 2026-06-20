package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetJpaRepository;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantEntity;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductAssetVariantPersistenceIntegrationTest extends AbstractHttpIntegrationTest {
    private static final String CHECKSUM = "a".repeat(64);
    private static final String SOURCE_CHECKSUM = "b".repeat(64);

    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private ProductOnlineProfileRepositoryPort profileRepositoryPort;
    @Autowired
    private ProductAssetRepositoryPort assetRepositoryPort;
    @Autowired
    private ProductAssetJpaRepository assetJpaRepository;
    @Autowired
    private ProductAssetVariantJpaRepository variantRepository;

    @Test
    void shouldApplyProductAssetVariantsMigrationV19() {
        assertTableExists("ecommerce_product_asset_variants");
        assertIndexExists("idx_ecommerce_asset_variants_asset");
        assertIndexExists("idx_ecommerce_asset_variants_storage_key");
        assertIndexExists("uq_ecommerce_asset_variants_active_kind");
        assertIndexExists("uq_ecommerce_asset_variants_preferred_active");
    }

    @Test
    void shouldPersistValidPrimaryOptimizedWebpVariant() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-valid");

        ProductAssetVariantEntity saved = variantRepository.saveAndFlush(validVariant(asset.id(), "valid", true, true));

        assertNotNull(saved.getId());
        assertEquals(asset.id(), saved.getProductAssetId());
        assertEquals(ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP, saved.getVariantKind());
        assertEquals("image/webp", saved.getMimeType());
        assertTrue(saved.isActive());
        assertTrue(saved.isPreferred());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    void shouldRejectNonWebpMimeType() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-mime");
        ProductAssetVariantEntity variant = validVariant(asset.id(), "mime", true, false);
        variant.setMimeType("image/png");

        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(variant));
    }

    @Test
    void shouldRejectInvalidWidthHeightAndSizeBytes() throws Exception {
        ProductAsset widthAsset = createOriginalAsset("variant-width");
        ProductAssetVariantEntity invalidWidth = validVariant(widthAsset.id(), "width", true, false);
        invalidWidth.setWidth(0);

        ProductAsset heightAsset = createOriginalAsset("variant-height");
        ProductAssetVariantEntity invalidHeight = validVariant(heightAsset.id(), "height", true, false);
        invalidHeight.setHeight(0);

        ProductAsset sizeAsset = createOriginalAsset("variant-size");
        ProductAssetVariantEntity invalidSize = validVariant(sizeAsset.id(), "size", true, false);
        invalidSize.setSizeBytes(0L);

        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(invalidWidth));
        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(invalidHeight));
        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(invalidSize));
    }

    @Test
    void shouldRejectInvalidChecksums() throws Exception {
        ProductAsset checksumAsset = createOriginalAsset("variant-checksum");
        ProductAssetVariantEntity invalidChecksum = validVariant(checksumAsset.id(), "checksum", true, false);
        invalidChecksum.setChecksumSha256("too-short");

        ProductAsset sourceChecksumAsset = createOriginalAsset("variant-source-checksum");
        ProductAssetVariantEntity invalidSourceChecksum = validVariant(sourceChecksumAsset.id(), "source-checksum", true, false);
        invalidSourceChecksum.setSourceChecksumSha256("too-short");

        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(invalidChecksum));
        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(invalidSourceChecksum));
    }

    @Test
    void shouldRejectPreferredInactiveVariant() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-preferred-inactive");
        ProductAssetVariantEntity variant = validVariant(asset.id(), "preferred-inactive", false, true);

        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(variant));
    }

    @Test
    void shouldRejectMoreThanOneActiveVariantOfSameKindForAsset() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-active-unique");
        variantRepository.saveAndFlush(validVariant(asset.id(), "active-one", true, false));

        assertThrows(DataIntegrityViolationException.class,
                () -> variantRepository.saveAndFlush(validVariant(asset.id(), "active-two", true, false)));
    }

    @Test
    void shouldRejectMoreThanOnePreferredActiveVariantForAsset() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-preferred-unique");
        variantRepository.saveAndFlush(validVariant(asset.id(), "preferred-one", true, true));

        assertThrows(DataIntegrityViolationException.class,
                () -> variantRepository.saveAndFlush(validVariant(asset.id(), "preferred-two", true, true)));
    }

    @Test
    void shouldFindActiveAndPreferredVariantByAssetAndKind() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-repository");
        ProductAssetVariantEntity saved = variantRepository.saveAndFlush(validVariant(asset.id(), "repository", true, true));

        assertEquals(saved.getId(), variantRepository.findFirstByProductAssetIdAndVariantKindAndActiveTrue(
                asset.id(), ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP).orElseThrow().getId());
        assertEquals(saved.getId(), variantRepository.findFirstByProductAssetIdAndVariantKindAndActiveTrueAndPreferredTrue(
                asset.id(), ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP).orElseThrow().getId());
    }

    @Test
    void shouldCascadeDeleteVariantsWhenOriginalAssetIsDeleted() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-cascade");
        ProductAssetVariantEntity saved = variantRepository.saveAndFlush(validVariant(asset.id(), "cascade", true, true));

        assetJpaRepository.deleteById(asset.id());

        assertFalse(variantRepository.findById(saved.getId()).isPresent());
    }

    private void assertTableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?",
                Integer.class,
                tableName
        );
        assertEquals(1, count);
    }

    private void assertIndexExists(String indexName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = ?",
                Integer.class,
                indexName
        );
        assertEquals(1, count);
    }

    private ProductAsset createOriginalAsset(String prefix) throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String normalizedPrefix = prefix.substring(0, Math.min(prefix.length(), 3));
        String suffix = normalizedPrefix + "-" + uniqueSuffix();
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        ProductOnlineProfile profile = profileRepositoryPort.save(new ProductOnlineProfile(
                null,
                productId,
                OnlinePublicationStatus.DRAFT,
                "profile-" + suffix,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "it",
                "it"
        ));

        return assetRepositoryPort.save(new ProductAsset(
                null,
                profile.id(),
                AssetType.PRODUCT_IMAGE,
                "https://cdn.example.test/ecommerce/products/" + productId + "/original.jpg",
                "Original preservado",
                AssetSource.OWN,
                true,
                true,
                true,
                0,
                "S3",
                "inktoy-test-bucket",
                "ecommerce/products/" + productId + "/original.jpg",
                "image/jpeg",
                96,
                72,
                1501L,
                SOURCE_CHECKSUM,
                "original.jpg",
                null,
                null,
                "it",
                "it"
        ));
    }

    private ProductAssetVariantEntity validVariant(Long productAssetId, String keySuffix, boolean active, boolean preferred) {
        ProductAssetVariantEntity variant = new ProductAssetVariantEntity();
        variant.setProductAssetId(productAssetId);
        variant.setVariantKind(ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP);
        variant.setAssetUrl("https://cdn.example.test/ecommerce/products/assets/" + productAssetId + "/" + keySuffix + ".webp");
        variant.setStorageProvider("S3");
        variant.setStorageBucket("inktoy-test-bucket");
        variant.setStorageKey("ecommerce/products/assets/" + productAssetId + "/variants/" + keySuffix + ".webp");
        variant.setMimeType("image/webp");
        variant.setWidth(96);
        variant.setHeight(72);
        variant.setSizeBytes(762L);
        variant.setChecksumSha256(CHECKSUM);
        variant.setSourceChecksumSha256(SOURCE_CHECKSUM);
        variant.setActive(active);
        variant.setPreferred(preferred);
        variant.setCreatedBy("it");
        variant.setUpdatedBy("it");
        return variant;
    }

    private String uniqueSuffix() {
        String value = Long.toString(System.nanoTime(), 36);
        return value.length() > 10 ? value.substring(value.length() - 10) : value;
    }
}
