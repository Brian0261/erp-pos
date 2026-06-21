package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantFormat;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantPurpose;
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
    void shouldApplyProductAssetVariantsMigrationV20() {
        assertTableExists("ecommerce_product_asset_variants");
        assertColumnExists("ecommerce_product_asset_variants", "format");
        assertColumnExists("ecommerce_product_asset_variants", "purpose");
        assertColumnExists("ecommerce_product_asset_variants", "target_width");
        assertColumnExists("ecommerce_product_asset_variants", "sort_order");
        assertIndexExists("idx_ecommerce_asset_variants_asset");
        assertIndexExists("idx_ecommerce_asset_variants_storage_key");
        assertIndexExists("idx_ecommerce_asset_variants_lookup");
        assertIndexExists("uq_ecommerce_asset_variants_active_identity");
        assertIndexExists("uq_ecommerce_asset_variants_preferred_active");
    }

    @Test
    void shouldPersistValidPrimaryOptimizedWebpVariant() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-valid");

        ProductAssetVariantEntity saved = variantRepository.saveAndFlush(validVariant(asset.id(), "valid", true, true));

        assertNotNull(saved.getId());
        assertEquals(asset.id(), saved.getProductAssetId());
        assertEquals(ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP, saved.getVariantKind());
        assertEquals(ProductAssetVariantFormat.WEBP, saved.getFormat());
        assertEquals(ProductAssetVariantPurpose.PRIMARY, saved.getPurpose());
        assertEquals(96, saved.getTargetWidth());
        assertEquals(0, saved.getSortOrder());
        assertEquals("image/webp", saved.getMimeType());
        assertTrue(saved.isActive());
        assertTrue(saved.isPreferred());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    void shouldPersistMultipleActiveResponsiveWebpVariantsWithDistinctTargetWidths() throws Exception {
        ProductAsset asset = createOriginalAsset("variant-responsive");

        ProductAssetVariantEntity variant320 = variantRepository.saveAndFlush(responsiveVariant(asset.id(), "responsive-320", 320));
        ProductAssetVariantEntity variant640 = variantRepository.saveAndFlush(responsiveVariant(asset.id(), "responsive-640", 640));

        assertNotNull(variant320.getId());
        assertNotNull(variant640.getId());
        assertEquals(ProductAssetVariantKind.PRIMARY_RESPONSIVE_WEBP, variant320.getVariantKind());
        assertEquals(ProductAssetVariantKind.PRIMARY_RESPONSIVE_WEBP, variant640.getVariantKind());
        assertEquals(ProductAssetVariantPurpose.RESPONSIVE, variant320.getPurpose());
        assertEquals(ProductAssetVariantPurpose.RESPONSIVE, variant640.getPurpose());
        assertEquals(320, variant320.getTargetWidth());
        assertEquals(640, variant640.getTargetWidth());
        assertTrue(variant320.isActive());
        assertTrue(variant640.isActive());
        assertFalse(variant320.isPreferred());
        assertFalse(variant640.isPreferred());
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
    void shouldRejectInvalidTargetWidthAndSortOrder() throws Exception {
        ProductAsset targetAsset = createOriginalAsset("variant-target-width");
        ProductAssetVariantEntity invalidTargetWidth = responsiveVariant(targetAsset.id(), "target-width", 320);
        invalidTargetWidth.setTargetWidth(0);

        ProductAsset sortAsset = createOriginalAsset("variant-sort-order");
        ProductAssetVariantEntity invalidSortOrder = responsiveVariant(sortAsset.id(), "sort-order", 320);
        invalidSortOrder.setSortOrder(-1);

        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(invalidTargetWidth));
        assertThrows(DataIntegrityViolationException.class, () -> variantRepository.saveAndFlush(invalidSortOrder));
    }

    @Test
    void shouldRejectInvalidFormatPurposeAndAvifMimeType() throws Exception {
        ProductAsset formatAsset = createOriginalAsset("variant-format");
        ProductAsset purposeAsset = createOriginalAsset("variant-purpose");
        ProductAsset avifAsset = createOriginalAsset("variant-avif");

        assertThrows(DataIntegrityViolationException.class,
                () -> insertRawVariant(formatAsset.id(), "AVIF", "RESPONSIVE", "image/webp", 320, 0, "format"));
        assertThrows(DataIntegrityViolationException.class,
                () -> insertRawVariant(purposeAsset.id(), "WEBP", "UNKNOWN", "image/webp", 320, 0, "purpose"));
        assertThrows(DataIntegrityViolationException.class,
                () -> insertRawVariant(avifAsset.id(), "WEBP", "RESPONSIVE", "image/avif", 320, 0, "avif"));
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
    void shouldRejectDuplicateActiveVariantIdentityForAsset() throws Exception {
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
                () -> variantRepository.saveAndFlush(responsiveVariant(asset.id(), "preferred-two", 320, true)));
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

    private void assertColumnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ? AND column_name = ?",
                Integer.class,
                tableName,
                columnName
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
        variant.setFormat(ProductAssetVariantFormat.WEBP);
        variant.setPurpose(ProductAssetVariantPurpose.PRIMARY);
        variant.setTargetWidth(96);
        variant.setSortOrder(0);
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

    private ProductAssetVariantEntity responsiveVariant(Long productAssetId, String keySuffix, int targetWidth) {
        return responsiveVariant(productAssetId, keySuffix, targetWidth, false);
    }

    private ProductAssetVariantEntity responsiveVariant(Long productAssetId, String keySuffix, int targetWidth, boolean preferred) {
        ProductAssetVariantEntity variant = validVariant(productAssetId, keySuffix, true, preferred);
        variant.setVariantKind(ProductAssetVariantKind.PRIMARY_RESPONSIVE_WEBP);
        variant.setPurpose(ProductAssetVariantPurpose.RESPONSIVE);
        variant.setTargetWidth(targetWidth);
        variant.setSortOrder(targetWidth);
        variant.setWidth(targetWidth);
        variant.setHeight(Math.max(1, Math.round(targetWidth * 0.75f)));
        variant.setSizeBytes((long) targetWidth * 8L);
        variant.setStorageKey("ecommerce/products/assets/" + productAssetId + "/variants/responsive-" + keySuffix + ".webp");
        variant.setAssetUrl("https://cdn.example.test/ecommerce/products/assets/" + productAssetId + "/responsive-" + keySuffix + ".webp");
        return variant;
    }

    private void insertRawVariant(
            Long productAssetId,
            String format,
            String purpose,
            String mimeType,
            int targetWidth,
            int sortOrder,
            String keySuffix
    ) {
        jdbcTemplate.update(
                """
                        insert into ecommerce_product_asset_variants (
                            product_asset_id,
                            variant_kind,
                            format,
                            purpose,
                            target_width,
                            sort_order,
                            asset_url,
                            storage_key,
                            mime_type,
                            width,
                            height,
                            size_bytes,
                            checksum_sha256,
                            source_checksum_sha256,
                            active,
                            preferred
                        ) values (?, 'PRIMARY_RESPONSIVE_WEBP', ?, ?, ?, ?, ?, ?, ?, 320, 240, 1000, ?, ?, true, false)
                        """,
                productAssetId,
                format,
                purpose,
                targetWidth,
                sortOrder,
                "https://cdn.example.test/ecommerce/products/assets/" + productAssetId + "/raw-" + keySuffix + ".webp",
                "ecommerce/products/assets/" + productAssetId + "/variants/raw-" + keySuffix + ".webp",
                mimeType,
                CHECKSUM,
                SOURCE_CHECKSUM
        );
    }

    private String uniqueSuffix() {
        String value = Long.toString(System.nanoTime(), 36);
        return value.length() > 10 ? value.substring(value.length() - 10) : value;
    }
}
