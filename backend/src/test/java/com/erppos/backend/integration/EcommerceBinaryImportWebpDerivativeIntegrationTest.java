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
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {
        "app.ecommerce.public-images.allowed-domains=cdn-staging.inktoy.pe",
        "app.ecommerce.image-storage.public-base-url=https://cdn-staging.inktoy.pe",
        "app.ecommerce.image-storage.max-size-bytes=1048576",
        "app.ecommerce.image-storage.max-width=2000",
        "app.ecommerce.image-storage.max-height=2000"
})
class EcommerceBinaryImportWebpDerivativeIntegrationTest extends AbstractHttpIntegrationTest {
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
    void confirmFileShouldPersistOriginalJpegAndPreferredWebpVariant() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "jpg", BigDecimal.valueOf(11));
        createDraftProfile(productId);

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{{productSku(suffix + "jpg"), "images/primary.jpg", "JPEG alt", "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem("images/primary.jpg", jpegGradientBytes(96, 72))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.rows[0].applied").value(true));

        ProductAsset asset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        ProductAssetVariantEntity variant = activePreferredVariant(asset).get(0);
        assertEquals("image/jpeg", asset.mimeType());
        assertEquals("image/webp", variant.getMimeType());
        assertEquals(asset.checksumSha256(), variant.getSourceChecksumSha256());
        assertTrue(variant.getSizeBytes() < asset.sizeBytes());
        assertTrue(variant.getStorageKey().contains("/variants/"));
    }

    @Test
    void confirmFileShouldPersistResponsiveWebpVariantsForLargeJpeg() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "jpglarge", BigDecimal.valueOf(11));
        createDraftProfile(productId);

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{{productSku(suffix + "jpglarge"), "images/primary-large.jpg", "JPEG large alt", "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem("images/primary-large.jpg", jpegGradientBytes(1600, 1200))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.rows[0].applied").value(true));

        ProductAsset asset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        ProductAssetVariantEntity preferredVariant = activePreferredVariant(asset).get(0);
        List<ProductAssetVariantEntity> responsiveVariants = activeResponsiveVariants(asset);

        assertEquals("image/jpeg", asset.mimeType());
        assertEquals("image/webp", preferredVariant.getMimeType());
        assertTrue(preferredVariant.isPreferred());
        assertEquals(List.of(320, 640, 960, 1280), responsiveVariants.stream().map(ProductAssetVariantEntity::getTargetWidth).sorted().toList());
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
        verify(imageStoragePort, times(6)).store(any());
    }

    @Test
    void confirmFileShouldPersistResponsiveWebpVariantsForTransparentPngWithoutUpscaling() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "pnglarge", BigDecimal.valueOf(12));
        createDraftProfile(productId);

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{{productSku(suffix + "pnglarge"), "images/transparent-large.png", "PNG large alt", "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem("images/transparent-large.png", transparentPngBytes(800, 800))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0));

        ProductAsset asset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        List<ProductAssetVariantEntity> responsiveVariants = activeResponsiveVariants(asset);

        assertEquals("image/png", asset.mimeType());
        assertEquals(List.of(320, 640), responsiveVariants.stream().map(ProductAssetVariantEntity::getTargetWidth).sorted().toList());
        for (ProductAssetVariantEntity variant : responsiveVariants) {
            assertEquals(ProductAssetVariantFormat.WEBP, variant.getFormat());
            assertEquals(ProductAssetVariantPurpose.RESPONSIVE, variant.getPurpose());
            assertEquals("image/webp", variant.getMimeType());
            assertEquals(variant.getTargetWidth(), variant.getWidth());
            assertFalse(variant.isPreferred());
        }
    }

    @Test
    void confirmFileShouldKeepSmallTransparentPngOriginalAndSkipNonReducingVariant() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "png", BigDecimal.valueOf(12));
        createDraftProfile(productId);

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{{productSku(suffix + "png"), "images/transparent.png", "PNG alt", "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem("images/transparent.png", transparentPngBytes(8, 8))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0));

        ProductAsset asset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        assertEquals("image/png", asset.mimeType());
        assertTrue(activePreferredVariant(asset).isEmpty());
        assertTrue(activeResponsiveVariants(asset).isEmpty());
    }

    @Test
    void confirmFileShouldPersistOriginalWebpWithoutDerivative() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "webp", BigDecimal.valueOf(13));
        createDraftProfile(productId);

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{{productSku(suffix + "webp"), "images/original.webp", "WebP alt", "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem("images/original.webp", webpVp8Bytes(16, 12))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rows[0].storageKey", endsWith(".webp")));

        ProductAsset asset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        assertEquals("image/webp", asset.mimeType());
        assertTrue(activePreferredVariant(asset).isEmpty());
        assertTrue(activeResponsiveVariants(asset).isEmpty());
        verify(imageStoragePort, times(1)).store(any());
    }

    @Test
    void previewShouldNotUploadOrPersistVariant() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "preview", BigDecimal.valueOf(14));
        createDraftProfile(productId);
        long variantCountBeforePreview = variantJpaRepository.count();

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbookFile(new String[][]{{productSku(suffix + "preview"), "images/primary.jpg", "Preview alt", "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem("images/primary.jpg", jpegGradientBytes(96, 72))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0));

        verify(imageStoragePort, never()).store(any());
        assertFalse(ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).isPresent());
        assertEquals(variantCountBeforePreview, variantJpaRepository.count());
    }

    @Test
    void replacementShouldDeactivatePreviousVariantWhenNewVariantIsCreatedOrSkipped() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "replace", BigDecimal.valueOf(15));
        createDraftProfile(productId);

        confirmOne(adminToken, suffix + "replace", "images/first.jpg", jpegGradientBytes(96, 72), "First alt");
        ProductAsset assetAfterFirst = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        ProductAssetVariantEntity firstVariant = activePreferredVariant(assetAfterFirst).get(0);

        confirmOne(adminToken, suffix + "replace", "images/second.jpg", jpegGradientBytes(120, 80), "Second alt");
        ProductAsset assetAfterSecond = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        ProductAssetVariantEntity secondVariant = activePreferredVariant(assetAfterSecond).get(0);
        assertEquals(assetAfterFirst.id(), assetAfterSecond.id());
        assertFalse(variantJpaRepository.findById(firstVariant.getId()).orElseThrow().isActive());
        assertTrue(secondVariant.isActive());

        confirmOne(adminToken, suffix + "replace", "images/original.webp", webpVp8Bytes(16, 12), "WebP alt");
        ProductAsset assetAfterWebp = ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).orElseThrow();
        assertEquals("image/webp", assetAfterWebp.mimeType());
        assertTrue(activePreferredVariant(assetAfterWebp).isEmpty());
        assertFalse(variantJpaRepository.findById(secondVariant.getId()).orElseThrow().isActive());
    }

    @Test
    void replacementShouldDeactivatePreviousResponsiveVariantsAndKeepOtherAssetsUntouched() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long replaceProductId = createCatalogProduct(adminToken, suffix + "rr", BigDecimal.valueOf(15));
        long otherProductId = createCatalogProduct(adminToken, suffix + "ro", BigDecimal.valueOf(16));
        createDraftProfile(replaceProductId);
        createDraftProfile(otherProductId);

        confirmOne(adminToken, suffix + "rr", "images/first.jpg", jpegGradientBytes(1000, 750), "First alt");
        ProductAsset firstAsset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(replaceProductId).orElseThrow();
        List<Long> firstResponsiveVariantIds = activeResponsiveVariants(firstAsset).stream()
                .map(ProductAssetVariantEntity::getId)
                .toList();

        confirmOne(adminToken, suffix + "ro", "images/other.jpg", jpegGradientBytes(1000, 750), "Other alt");
        ProductAsset otherAsset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(otherProductId).orElseThrow();
        List<Long> otherResponsiveVariantIds = activeResponsiveVariants(otherAsset).stream()
                .map(ProductAssetVariantEntity::getId)
                .toList();

        confirmOne(adminToken, suffix + "rr", "images/second.jpg", jpegGradientBytes(1000, 750), "Second alt");
        ProductAsset secondAsset = ecommerceCatalogUseCase.getPrimaryAssetByProductId(replaceProductId).orElseThrow();

        assertEquals(firstAsset.id(), secondAsset.id());
        assertFalse(firstResponsiveVariantIds.isEmpty());
        for (Long variantId : firstResponsiveVariantIds) {
            assertFalse(variantJpaRepository.findById(variantId).orElseThrow().isActive());
        }
        assertEquals(List.of(320, 640, 960), activeResponsiveVariants(secondAsset).stream().map(ProductAssetVariantEntity::getTargetWidth).sorted().toList());
        for (Long variantId : otherResponsiveVariantIds) {
            assertTrue(variantJpaRepository.findById(variantId).orElseThrow().isActive());
        }
    }

    @Test
    void derivativeStorageFailureShouldCleanNewOriginalAndKeepOtherRowsSuccessful() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long failProductId = createCatalogProduct(adminToken, suffix + "fail", BigDecimal.valueOf(16));
        long okProductId = createCatalogProduct(adminToken, suffix + "ok", BigDecimal.valueOf(17));
        createDraftProfile(failProductId);
        createDraftProfile(okProductId);
        doAnswer(invocation -> {
            EcommerceImageStoragePort.EcommerceImageStorageObject object = invocation.getArgument(0);
            if ("image/webp".equals(object.mimeType()) && object.storageKey().contains("/products/" + failProductId + "/")) {
                throw new RuntimeException("Derivative storage failed");
            }
            return new EcommerceImageStoragePort.StoredEcommerceImage("S3", "inktoy-test-bucket", object.storageKey(), "https://cdn-staging.inktoy.pe/" + object.storageKey());
        }).when(imageStoragePort).store(any());

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{
                                {productSku(suffix + "fail"), "images/fail.jpg", "Fail alt", "OWN", "true", "", "0", "", "", "", ""},
                                {productSku(suffix + "ok"), "images/ok.jpg", "Ok alt", "OWN", "true", "", "0", "", "", "", ""}
                        }))
                        .file(archiveFile(
                                new ZipItem("images/fail.jpg", jpegGradientBytes(96, 72)),
                                new ZipItem("images/ok.jpg", jpegGradientBytes(96, 72))
                        ))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].applied").value(false))
                .andExpect(jsonPath("$.rows[0].errors[0]").value("Derivative storage failed"))
                .andExpect(jsonPath("$.rows[1].applied").value(true));

        assertFalse(ecommerceCatalogUseCase.getPrimaryAssetByProductId(failProductId).isPresent());
        assertTrue(ecommerceCatalogUseCase.getPrimaryAssetByProductId(okProductId).isPresent());
        verify(imageStoragePort, times(1)).delete(anyString());
    }

    @Test
    void responsiveStorageFailureShouldCleanNewObjectsAndKeepOtherRowsSuccessful() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long failProductId = createCatalogProduct(adminToken, suffix + "respfail", BigDecimal.valueOf(16));
        long okProductId = createCatalogProduct(adminToken, suffix + "respok", BigDecimal.valueOf(17));
        createDraftProfile(failProductId);
        createDraftProfile(okProductId);
        doAnswer(invocation -> {
            EcommerceImageStoragePort.EcommerceImageStorageObject object = invocation.getArgument(0);
            if (object.storageKey().contains("/products/" + failProductId + "/")
                    && object.storageKey().contains("/variants/responsive/")
                    && object.storageKey().contains("-640w-")) {
                throw new RuntimeException("Responsive storage failed");
            }
            return new EcommerceImageStoragePort.StoredEcommerceImage("S3", "inktoy-test-bucket", object.storageKey(), "https://cdn-staging.inktoy.pe/" + object.storageKey());
        }).when(imageStoragePort).store(any());

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{
                                {productSku(suffix + "respfail"), "images/fail.jpg", "Fail alt", "OWN", "true", "", "0", "", "", "", ""},
                                {productSku(suffix + "respok"), "images/ok.jpg", "Ok alt", "OWN", "true", "", "0", "", "", "", ""}
                        }))
                        .file(archiveFile(
                                new ZipItem("images/fail.jpg", jpegGradientBytes(1000, 750)),
                                new ZipItem("images/ok.jpg", jpegGradientBytes(96, 72))
                        ))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].applied").value(false))
                .andExpect(jsonPath("$.rows[0].errors[0]").value("Responsive storage failed"))
                .andExpect(jsonPath("$.rows[1].applied").value(true));

        assertFalse(ecommerceCatalogUseCase.getPrimaryAssetByProductId(failProductId).isPresent());
        assertTrue(ecommerceCatalogUseCase.getPrimaryAssetByProductId(okProductId).isPresent());
        verify(imageStoragePort, times(3)).delete(anyString());
    }

    private void confirmOne(String adminToken, String skuSuffix, String imagePath, byte[] imageBytes, String altText) throws Exception {
        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{{productSku(skuSuffix), imagePath, altText, "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem(imagePath, imageBytes)))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].applied").value(true));
    }

    private List<ProductAssetVariantEntity> activePreferredVariant(ProductAsset asset) {
        return variantJpaRepository.findAll().stream()
                .filter(variant -> variant.getProductAssetId().equals(asset.id()))
                .filter(variant -> variant.getVariantKind() == ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP)
                .filter(ProductAssetVariantEntity::isActive)
                .filter(ProductAssetVariantEntity::isPreferred)
                .toList();
    }

    private List<ProductAssetVariantEntity> activeResponsiveVariants(ProductAsset asset) {
        return variantJpaRepository.findAll().stream()
                .filter(variant -> variant.getProductAssetId().equals(asset.id()))
                .filter(variant -> variant.getVariantKind() == ProductAssetVariantKind.PRIMARY_RESPONSIVE_WEBP)
                .filter(ProductAssetVariantEntity::isActive)
                .toList();
    }

    private long createCatalogProduct(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        return createProduct(adminToken, categoryId, unitId, suffix, salePrice);
    }

    private void createDraftProfile(Long productId) {
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
    }

    private String productSku(String suffix) {
        return "SKU-IT-" + suffix;
    }

    private MockMultipartFile workbookFile(String[][] dataRows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("primary_images_binary");
            Row header = sheet.createRow(0);
            String[] headers = {"sku", "imageFile", "altText", "source", "rightsConfirmed", "assetType", "displayOrder", "publishedUpdateConfirmed", "productName", "publicationStatus", "currentImageUrl"};
            for (int index = 0; index < headers.length; index++) {
                header.createCell(index).setCellValue(headers[index]);
            }
            for (int rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
                Row row = sheet.createRow(rowIndex + 1);
                for (int cellIndex = 0; cellIndex < dataRows[rowIndex].length; cellIndex++) {
                    row.createCell(cellIndex).setCellValue(dataRows[rowIndex][cellIndex]);
                }
            }
            workbook.write(outputStream);
            return new MockMultipartFile("workbook", "primary-images-binary.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", outputStream.toByteArray());
        }
    }

    private MockMultipartFile archiveFile(ZipItem... items) throws Exception {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream(); ZipOutputStream zip = new ZipOutputStream(outputStream)) {
            for (ZipItem item : items) {
                zip.putNextEntry(new ZipEntry(item.name()));
                zip.write(item.bytes());
                zip.closeEntry();
            }
            zip.finish();
            return new MockMultipartFile("archive", "images.zip", "application/zip", outputStream.toByteArray());
        }
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

    private byte[] transparentPngBytes(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(new Color(255, 0, 0, 96));
            graphics.fillOval(1, 1, width - 2, height - 2);
        } finally {
            graphics.dispose();
        }
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

    private byte[] riffWebpChunk(String fourCc, byte[] payload) {
        int chunkSize = payload.length;
        int paddedChunkSize = chunkSize + (chunkSize % 2);
        int riffSize = 4 + 8 + paddedChunkSize;
        byte[] bytes = new byte[8 + riffSize];
        bytes[0] = 'R';
        bytes[1] = 'I';
        bytes[2] = 'F';
        bytes[3] = 'F';
        writeIntLittleEndian(bytes, 4, riffSize);
        bytes[8] = 'W';
        bytes[9] = 'E';
        bytes[10] = 'B';
        bytes[11] = 'P';
        for (int index = 0; index < 4; index++) {
            bytes[12 + index] = (byte) fourCc.charAt(index);
        }
        writeIntLittleEndian(bytes, 16, chunkSize);
        System.arraycopy(payload, 0, bytes, 20, payload.length);
        return bytes;
    }

    private void writeShortLittleEndian(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) (value & 0xFF);
        bytes[offset + 1] = (byte) ((value >>> 8) & 0x3F);
    }

    private void writeIntLittleEndian(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) (value & 0xFF);
        bytes[offset + 1] = (byte) ((value >>> 8) & 0xFF);
        bytes[offset + 2] = (byte) ((value >>> 16) & 0xFF);
        bytes[offset + 3] = (byte) ((value >>> 24) & 0xFF);
    }

    private record ZipItem(String name, byte[] bytes) {
    }
}
