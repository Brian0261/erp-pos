package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariant;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceImageStoragePort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetVariantRepositoryPort;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
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
        "app.ecommerce.image-storage.max-width=1000",
        "app.ecommerce.image-storage.max-height=1000"
})
class EcommerceBinaryImportWebpDerivativeFailureIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

    @MockitoBean
    private EcommerceImageStoragePort imageStoragePort;
    @MockitoBean
    private ProductAssetVariantRepositoryPort assetVariantRepositoryPort;

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
    void dbFailureAfterOriginalAndDerivativeUploadShouldCleanBothAndRollbackAsset() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "dbfail", BigDecimal.valueOf(18));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        doThrow(new RuntimeException("Variant DB failed")).when(assetVariantRepositoryPort).save(any(ProductAssetVariant.class));

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{{productSku(suffix + "dbfail"), "images/primary.jpg", "DB fail alt", "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem("images/primary.jpg", jpegGradientBytes(96, 72))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(0))
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].applied").value(false))
                .andExpect(jsonPath("$.rows[0].errors[0]").value("Variant DB failed"));

        assertFalse(ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).isPresent());
        verify(imageStoragePort, times(2)).delete(anyString());
    }

    @Test
    void dbFailureAfterResponsiveUploadsShouldCleanOriginalDerivativeAndResponsiveVariants() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "rf", BigDecimal.valueOf(19));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        doThrow(new RuntimeException("Variant DB failed")).when(assetVariantRepositoryPort).save(any(ProductAssetVariant.class));

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbookFile(new String[][]{{productSku(suffix + "rf"), "images/primary-large.jpg", "DB fail alt", "OWN", "true", "", "0", "", "", "", ""}}))
                        .file(archiveFile(new ZipItem("images/primary-large.jpg", jpegGradientBytes(1000, 750))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(0))
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].applied").value(false))
                .andExpect(jsonPath("$.rows[0].errors[0]").value("Variant DB failed"));

        assertFalse(ecommerceCatalogUseCase.getPrimaryAssetByProductId(productId).isPresent());
        verify(imageStoragePort, times(5)).delete(anyString());
    }

    private long createCatalogProduct(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        return createProduct(adminToken, categoryId, unitId, suffix, salePrice);
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

    private record ZipItem(String name, byte[] bytes) {
    }
}
