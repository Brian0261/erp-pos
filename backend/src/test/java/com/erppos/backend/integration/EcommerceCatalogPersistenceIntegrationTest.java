package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceCatalogProductSnapshot;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceBrandRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceCatalogProductReadPort;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.OnlinePriceOverrideRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetRepositoryPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EcommerceCatalogPersistenceIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private EcommerceBrandRepositoryPort brandRepositoryPort;
    @Autowired
    private EcommerceOnlineCategoryRepositoryPort onlineCategoryRepositoryPort;
    @Autowired
    private ProductOnlineProfileRepositoryPort profileRepositoryPort;
    @Autowired
    private ProductAssetRepositoryPort assetRepositoryPort;
    @Autowired
    private OnlinePriceOverrideRepositoryPort priceOverrideRepositoryPort;
    @Autowired
    private EcommerceCatalogProductReadPort productReadPort;

    @Test
    void shouldApplyEcommerceCatalogMigrationV17() {
        assertTableExists("ecommerce_brands");
        assertTableExists("ecommerce_online_categories");
        assertTableExists("ecommerce_product_online_profiles");
        assertTableExists("ecommerce_seo_metadata");
        assertTableExists("ecommerce_product_assets");
        assertTableExists("ecommerce_online_price_overrides");
    }

    @Test
    void shouldPersistBrandAndRejectDuplicatedSlug() {
        String suffix = uniqueSuffix();
        EcommerceBrand saved = brandRepositoryPort.save(new EcommerceBrand(
                null, "Faber Test " + suffix, "faber-test-" + suffix, "Proveedor", true,
                null, null, "it", "it"
        ));

        assertNotNull(saved.id());
        assertTrue(brandRepositoryPort.existsBySlugIgnoreCase("FABER-TEST-" + suffix));
        assertThrows(DataIntegrityViolationException.class, () -> brandRepositoryPort.save(new EcommerceBrand(
                null, "Otra marca " + suffix, "FABER-TEST-" + suffix, null, true,
                null, null, "it", "it"
        )));
    }

    @Test
    void shouldPersistOnlineCategoryAndRejectDuplicatedSlug() {
        String suffix = uniqueSuffix();
        EcommerceOnlineCategory saved = onlineCategoryRepositoryPort.save(new EcommerceOnlineCategory(
                null, null, "Utiles Test " + suffix, "utiles-test-" + suffix, "SEO", true,
                null, null, "it", "it"
        ));

        assertNotNull(saved.id());
        assertTrue(onlineCategoryRepositoryPort.existsBySlugIgnoreCase("UTILES-TEST-" + suffix));
        assertThrows(DataIntegrityViolationException.class, () -> onlineCategoryRepositoryPort.save(new EcommerceOnlineCategory(
                null, null, "Duplicada " + suffix, "UTILES-TEST-" + suffix, null, true,
                null, null, "it", "it"
        )));
    }

    @Test
    void shouldPersistDraftProfileAndRejectDuplicateProductId() throws Exception {
        long productId = createBackendProduct("PROFILE");

        ProductOnlineProfile saved = createDraftProfile(productId, null);

        assertNotNull(saved.id());
        assertEquals(OnlinePublicationStatus.DRAFT, saved.publicationStatus());
        assertThrows(DataIntegrityViolationException.class, () -> createDraftProfile(productId, "duplicated-product"));
    }

    @Test
    void shouldRejectDuplicatedProductProfileSlug() throws Exception {
        String suffix = uniqueSuffix();
        long firstProductId = createBackendProduct("SLUG-A-" + suffix);
        long secondProductId = createBackendProduct("SLUG-B-" + suffix);

        createDraftProfile(firstProductId, "perfil-online-" + suffix);

        assertThrows(DataIntegrityViolationException.class,
                () -> createDraftProfile(secondProductId, "PERFIL-ONLINE-" + suffix));
    }

    @Test
    void shouldReadInternalProductSnapshotWithoutChangingCatalogBehavior() throws Exception {
        long productId = createBackendProduct("SNAPSHOT");

        EcommerceCatalogProductSnapshot snapshot = productReadPort.findById(productId).orElseThrow();

        assertEquals(productId, snapshot.id());
        assertTrue(snapshot.sku().startsWith("SKU-IT-"));
        assertEquals(BigDecimal.valueOf(10).setScale(2), snapshot.salePrice());
        assertTrue(snapshot.active());
    }

    @Test
    void shouldPersistPrimaryAssetAndRejectSecondActivePrimaryAsset() throws Exception {
        ProductOnlineProfile profile = createDraftProfile(createBackendProduct("ASSET"), "asset-profile-" + uniqueSuffix());

        ProductAsset saved = assetRepositoryPort.save(new ProductAsset(
                null, profile.id(), AssetType.PRODUCT_IMAGE, "https://cdn.example.test/product.jpg",
                "Producto de prueba", AssetSource.SUPPLIER, true, true, true, 0,
                null, null, "it", "it"
        ));

        assertNotNull(saved.id());
        assertTrue(assetRepositoryPort.findPrimaryActiveByProductOnlineProfileId(profile.id()).isPresent());
        assertThrows(DataIntegrityViolationException.class, () -> assetRepositoryPort.save(new ProductAsset(
                null, profile.id(), AssetType.PRODUCT_IMAGE, "https://cdn.example.test/product-2.jpg",
                "Producto duplicado", AssetSource.SUPPLIER, true, true, true, 1,
                null, null, "it", "it"
        )));
    }

    @Test
    void shouldPersistActivePriceOverrideAndRejectSecondActiveOverride() throws Exception {
        ProductOnlineProfile profile = createDraftProfile(createBackendProduct("PRICE"), "price-profile-" + uniqueSuffix());

        OnlinePriceOverride saved = priceOverrideRepositoryPort.save(new OnlinePriceOverride(
                null, profile.id(), BigDecimal.valueOf(9.90), "PEN", true,
                null, null, "Precio online inicial", null, null, "it", "it"
        ));

        assertNotNull(saved.id());
        assertTrue(priceOverrideRepositoryPort.findActiveByProductOnlineProfileId(profile.id()).isPresent());
        assertThrows(DataIntegrityViolationException.class, () -> priceOverrideRepositoryPort.save(new OnlinePriceOverride(
                null, profile.id(), BigDecimal.valueOf(8.90), "PEN", true,
                null, null, "Precio online duplicado", null, null, "it", "it"
        )));
    }

    private void assertTableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?",
                Integer.class,
                tableName
        );
        assertEquals(1, count);
    }

    private long createBackendProduct(String prefix) throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String normalizedPrefix = prefix.substring(0, Math.min(prefix.length(), 3));
        String suffix = normalizedPrefix + "-" + uniqueSuffix();
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        return createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
    }

    private ProductOnlineProfile createDraftProfile(long productId, String slug) {
        return profileRepositoryPort.save(new ProductOnlineProfile(
                null,
                productId,
                OnlinePublicationStatus.DRAFT,
                slug,
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
    }

    private String uniqueSuffix() {
        String value = Long.toString(System.nanoTime(), 36);
        return value.length() > 10 ? value.substring(value.length() - 10) : value;
    }
}
