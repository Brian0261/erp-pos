package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantFormat;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantPurpose;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceImageStoragePort;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantEntity;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {
        "app.ecommerce.public-images.allowed-domains=cdn-staging.inktoy.pe",
        "app.ecommerce.image-storage.public-base-url=https://cdn-staging.inktoy.pe",
        "app.ecommerce.image-storage.max-size-bytes=1048576",
        "app.ecommerce.image-storage.max-width=1000",
        "app.ecommerce.image-storage.max-height=1000"
})
class EcommerceManualPrimaryImageUploadDerivativeIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;
    @Autowired
    private ProductAssetVariantJpaRepository variantJpaRepository;

    @MockitoBean
    private EcommerceImageStoragePort imageStoragePort;

    @BeforeEach
    void setupImageStorage() {
        when(imageStoragePort.store(any())).thenAnswer(invocation -> {
            EcommerceImageStoragePort.EcommerceImageStorageObject object = invocation.getArgument(0);
            return new EcommerceImageStoragePort.StoredEcommerceImage(
                    "S3",
                    "inktoy-test-bucket",
                    object.storageKey(),
                    "https://cdn-staging.inktoy.pe/" + object.storageKey()
            );
        });
    }

    @Test
    void manualUploadShouldPersistOriginalAndPreferredWebpVariant() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "manual-primary.jpg",
                "image/jpeg",
                jpegGradientBytes(96, 72)
        );

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/{productId}/primary-asset/upload", productId)
                        .file(file)
                        .param("altText", "Manual JPEG")
                        .param("source", "OWN")
                        .param("rightsConfirmed", "true")
                        .param("displayOrder", "0")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mimeType").value("image/jpeg"))
                .andExpect(jsonPath("$.storageKey").value(org.hamcrest.Matchers.endsWith(".jpg")));

        ProductAsset asset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        var variant = variantJpaRepository.findFirstByProductAssetIdAndVariantKindAndActiveTrueAndPreferredTrue(
                asset.id(), ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP).orElseThrow();

        assertEquals("image/jpeg", asset.mimeType());
        assertEquals("image/webp", variant.getMimeType());
        assertEquals(asset.width(), variant.getWidth());
        assertEquals(asset.height(), variant.getHeight());
        assertEquals(asset.checksumSha256(), variant.getSourceChecksumSha256());
        assertTrue(variant.getSizeBytes() < asset.sizeBytes());
        assertTrue(variant.getStorageKey().contains("/variants/"));

        ArgumentCaptor<EcommerceImageStoragePort.EcommerceImageStorageObject> storageObjects = ArgumentCaptor.forClass(EcommerceImageStoragePort.EcommerceImageStorageObject.class);
        verify(imageStoragePort, org.mockito.Mockito.times(2)).store(storageObjects.capture());
        assertTrue(storageObjects.getAllValues().stream().anyMatch(object -> "image/jpeg".equals(object.mimeType())));
        assertTrue(storageObjects.getAllValues().stream().anyMatch(object -> "image/webp".equals(object.mimeType())));
    }

    @Test
    void manualUploadShouldPersistResponsiveWebpVariantsAsNonPreferred() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.TEN);
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "manual-primary-large.jpg",
                "image/jpeg",
                jpegGradientBytes(1000, 750)
        );

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/{productId}/primary-asset/upload", productId)
                        .file(file)
                        .param("altText", "Manual large JPEG")
                        .param("source", "OWN")
                        .param("rightsConfirmed", "true")
                        .param("displayOrder", "0")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk());

        ProductAsset asset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        List<ProductAssetVariantEntity> responsiveVariants = variantJpaRepository.findAll().stream()
                .filter(variant -> asset.id().equals(variant.getProductAssetId()))
                .filter(variant -> variant.getVariantKind() == ProductAssetVariantKind.PRIMARY_RESPONSIVE_WEBP)
                .filter(ProductAssetVariantEntity::isActive)
                .toList();

        assertEquals(List.of(320, 640, 960), responsiveVariants.stream().map(ProductAssetVariantEntity::getTargetWidth).sorted().toList());
        for (ProductAssetVariantEntity variant : responsiveVariants) {
            assertEquals(ProductAssetVariantFormat.WEBP, variant.getFormat());
            assertEquals(ProductAssetVariantPurpose.RESPONSIVE, variant.getPurpose());
            assertEquals("image/webp", variant.getMimeType());
            assertEquals(asset.checksumSha256(), variant.getSourceChecksumSha256());
            assertEquals(variant.getTargetWidth(), variant.getWidth());
            assertTrue(variant.getStorageKey().contains("/variants/responsive/"));
            assertTrue(variant.isActive());
            assertFalse(variant.isPreferred());
        }

        var preferredVariant = variantJpaRepository.findFirstByProductAssetIdAndVariantKindAndActiveTrueAndPreferredTrue(
                asset.id(), ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP).orElseThrow();
        assertEquals("image/webp", preferredVariant.getMimeType());

        ArgumentCaptor<EcommerceImageStoragePort.EcommerceImageStorageObject> storageObjects = ArgumentCaptor.forClass(EcommerceImageStoragePort.EcommerceImageStorageObject.class);
        verify(imageStoragePort, org.mockito.Mockito.times(5)).store(storageObjects.capture());
        assertEquals(3, storageObjects.getAllValues().stream()
                .filter(object -> object.storageKey().contains("/variants/responsive/"))
                .count());
    }

    private byte[] jpegGradientBytes(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            for (int y = 0; y < image.getHeight(); y++) {
                for (int x = 0; x < image.getWidth(); x++) {
                    int red = (x * 255) / image.getWidth();
                    int green = (y * 255) / image.getHeight();
                    int blue = ((x + y) * 255) / (image.getWidth() + image.getHeight());
                    image.setRGB(x, y, new Color(red, green, blue).getRGB());
                }
            }
            graphics.setColor(Color.WHITE);
            graphics.fillOval(18, 14, 42, 42);
            graphics.setColor(new Color(20, 65, 140));
            graphics.fillRect(48, 32, 30, 18);
        } finally {
            graphics.dispose();
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", output);
        return output.toByteArray();
    }
}
