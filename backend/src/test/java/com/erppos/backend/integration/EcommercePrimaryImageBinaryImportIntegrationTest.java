package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductAssetCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductSeoMetadataCommand;
import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceImageStoragePort;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {
        "app.ecommerce.public-images.allowed-domains=cdn-staging.inktoy.pe",
        "app.ecommerce.image-storage.public-base-url=https://cdn-staging.inktoy.pe",
        "app.ecommerce.image-storage.max-size-bytes=1000",
        "app.ecommerce.image-storage.max-width=1",
        "app.ecommerce.image-storage.max-height=1"
})
class EcommercePrimaryImageBinaryImportIntegrationTest extends AbstractHttpIntegrationTest {
    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

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
    void shouldDownloadBinaryTemplateAndKeepUrlImportEndpointIntact() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/template")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("ecommerce-primary-images-binary-import-template.xlsx")));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/template")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("ecommerce-primary-images-url-import-template.xlsx")));
    }

    @Test
    void previewShouldValidateBinaryImagesWithoutPersistingOrUploading() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "preview", BigDecimal.valueOf(10.00));
        createDraftProfile(productId);

        MockMultipartFile workbook = workbookFile(new String[][]{{
                productSku(suffix + "preview"),
                "images/valid.png",
                "Valid alt",
                "OWN",
                "true",
                "",
                "0",
                "",
                "",
                "",
                ""
        }});
        MockMultipartFile archive = archiveFile(new ZipItem("images/valid.png", pngBytes(1, 1)));

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archive)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.rows[0].action").value("CREATE"))
                .andExpect(jsonPath("$.rows[0].mimeType").value("image/png"))
                .andExpect(jsonPath("$.rows[0].width").value(1))
                .andExpect(jsonPath("$.rows[0].height").value(1));

        verify(imageStoragePort, never()).store(any());
        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryAsset").doesNotExist());
    }

    @Test
    void confirmFileShouldRevalidateUploadAndApplyValidRowsOnly() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "confirm", BigDecimal.valueOf(11.00));
        createDraftProfile(productId);

        MockMultipartFile workbook = workbookFile(new String[][]{
                {productSku(suffix + "confirm"), "images/valid.jpg", "Imported alt", "SUPPLIER", "true", "", "2", "", "", "", ""},
                {"SKU-NO-EXISTE-BIN-" + suffix, "images/missing-sku.png", "Missing sku", "OWN", "true", "", "0", "", "", "", ""}
        });
        MockMultipartFile archive = archiveFile(
                new ZipItem("images/valid.jpg", jpegBytes(1, 1)),
                new ZipItem("images/missing-sku.png", pngBytes(1, 1))
        );

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbook)
                        .file(archive)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.updatedRows").value(0))
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].applied").value(true))
                .andExpect(jsonPath("$.rows[0].assetUrl", containsString("https://cdn-staging.inktoy.pe/")))
                .andExpect(jsonPath("$.rows[1].applied").value(false))
                .andExpect(jsonPath("$.rows[1].errors", hasItem("SKU not found")));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryAsset.assetType").value("PRODUCT_IMAGE"))
                .andExpect(jsonPath("$.primaryAsset.assetUrl", containsString("https://cdn-staging.inktoy.pe/")))
                .andExpect(jsonPath("$.primaryAsset.altText").value("Imported alt"))
                .andExpect(jsonPath("$.primaryAsset.source").value("SUPPLIER"))
                .andExpect(jsonPath("$.primaryAsset.rightsConfirmed").value(true))
                .andExpect(jsonPath("$.primaryAsset.displayOrder").value(2))
                .andExpect(jsonPath("$.primaryAsset.storageProvider").value("S3"))
                .andExpect(jsonPath("$.primaryAsset.mimeType").value("image/jpeg"))
                .andExpect(jsonPath("$.primaryAsset.width").value(1))
                .andExpect(jsonPath("$.primaryAsset.height").value(1))
                .andExpect(jsonPath("$.primaryAsset.originalFilename").value("valid.jpg"));
    }

    @Test
    void previewShouldValidateWebpDimensionsForVp8Vp8lAndVp8x() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long vp8ProductId = createCatalogProduct(adminToken, suffix + "vp8", BigDecimal.valueOf(10.00));
        long vp8lProductId = createCatalogProduct(adminToken, suffix + "vp8l", BigDecimal.valueOf(10.00));
        long vp8xProductId = createCatalogProduct(adminToken, suffix + "vp8x", BigDecimal.valueOf(10.00));
        createDraftProfile(vp8ProductId);
        createDraftProfile(vp8lProductId);
        createDraftProfile(vp8xProductId);

        MockMultipartFile workbook = workbookFile(new String[][]{
                {productSku(suffix + "vp8"), "images/lossy.webp", "Lossy WebP", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "vp8l"), "images/lossless.webp", "Lossless WebP", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "vp8x"), "images/extended.webp", "Extended WebP", "OWN", "true", "", "0", "", "", "", ""}
        });
        MockMultipartFile archive = archiveFile(
                new ZipItem("images/lossy.webp", webpVp8Bytes(1, 1)),
                new ZipItem("images/lossless.webp", webpVp8lBytes(1, 1)),
                new ZipItem("images/extended.webp", webpVp8xBytes(1, 1))
        );

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archive)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createRows").value(3))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.rows[0].mimeType").value("image/webp"))
                .andExpect(jsonPath("$.rows[0].width").value(1))
                .andExpect(jsonPath("$.rows[0].height").value(1))
                .andExpect(jsonPath("$.rows[1].mimeType").value("image/webp"))
                .andExpect(jsonPath("$.rows[1].width").value(1))
                .andExpect(jsonPath("$.rows[1].height").value(1))
                .andExpect(jsonPath("$.rows[2].mimeType").value("image/webp"))
                .andExpect(jsonPath("$.rows[2].width").value(1))
                .andExpect(jsonPath("$.rows[2].height").value(1));

        verify(imageStoragePort, never()).store(any());
    }

    @Test
    void confirmFileShouldStoreWebpWithWebpContentTypeAndStorageKey() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "webp", BigDecimal.valueOf(12.00));
        createDraftProfile(productId);

        MockMultipartFile workbook = workbookFile(new String[][]{{
                productSku(suffix + "webp"),
                "images/valid.webp",
                "Imported WebP alt",
                "SUPPLIER",
                "true",
                "",
                "2",
                "",
                "",
                "",
                ""
        }});
        MockMultipartFile archive = archiveFile(new ZipItem("images/valid.webp", webpVp8Bytes(1, 1)));

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file")
                        .file(workbook)
                        .file(archive)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.rows[0].applied").value(true))
                .andExpect(jsonPath("$.rows[0].assetUrl", containsString("https://cdn-staging.inktoy.pe/")))
                .andExpect(jsonPath("$.rows[0].storageKey", containsString(".webp")));

        ArgumentCaptor<EcommerceImageStoragePort.EcommerceImageStorageObject> storageObject = ArgumentCaptor.forClass(EcommerceImageStoragePort.EcommerceImageStorageObject.class);
        verify(imageStoragePort).store(storageObject.capture());
        assertEquals("image/webp", storageObject.getValue().mimeType());
        assertTrue(storageObject.getValue().storageKey().endsWith(".webp"));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryAsset.assetUrl", containsString("https://cdn-staging.inktoy.pe/")))
                .andExpect(jsonPath("$.primaryAsset.mimeType").value("image/webp"))
                .andExpect(jsonPath("$.primaryAsset.width").value(1))
                .andExpect(jsonPath("$.primaryAsset.height").value(1))
                .andExpect(jsonPath("$.primaryAsset.storageKey", containsString(".webp")))
                .andExpect(jsonPath("$.primaryAsset.originalFilename").value("valid.webp"));
    }

    @Test
    void previewShouldRejectRowLevelValidationErrors() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long duplicateProductId = createCatalogProduct(adminToken, suffix + "dup", BigDecimal.valueOf(10.00));
        long missingFileProductId = createCatalogProduct(adminToken, suffix + "missing", BigDecimal.valueOf(10.00));
        long badExtensionProductId = createCatalogProduct(adminToken, suffix + "ext", BigDecimal.valueOf(10.00));
        long badSignatureProductId = createCatalogProduct(adminToken, suffix + "sig", BigDecimal.valueOf(10.00));
        long badSizeProductId = createCatalogProduct(adminToken, suffix + "size", BigDecimal.valueOf(10.00));
        long badDimensionsProductId = createCatalogProduct(adminToken, suffix + "dim", BigDecimal.valueOf(10.00));
        long repeatedFileProductId = createCatalogProduct(adminToken, suffix + "rep", BigDecimal.valueOf(10.00));
        createDraftProfile(duplicateProductId);
        createDraftProfile(missingFileProductId);
        createDraftProfile(badExtensionProductId);
        createDraftProfile(badSignatureProductId);
        createDraftProfile(badSizeProductId);
        createDraftProfile(badDimensionsProductId);
        createDraftProfile(repeatedFileProductId);

        byte[] oversizedPng = appendBytes(pngBytes(1, 1), 1200);
        MockMultipartFile workbook = workbookFile(new String[][]{
                {productSku(suffix + "dup"), "images/a.png", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "dup"), "images/b.png", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "missing"), "images/not-found.png", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "ext"), "images/bad.jpg", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "sig"), "images/bad-signature.png", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "size"), "images/too-large.png", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "dim"), "images/too-wide.png", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "rep"), "images/a.png", "Alt", "OWN", "true", "", "0", "", "", "", ""}
        });
        MockMultipartFile archive = archiveFile(
                new ZipItem("images/a.png", pngBytes(1, 1)),
                new ZipItem("images/b.png", pngBytes(1, 1)),
                new ZipItem("images/bad.jpg", pngBytes(1, 1)),
                new ZipItem("images/bad-signature.png", new byte[]{1, 2, 3, 4}),
                new ZipItem("images/too-large.png", oversizedPng),
                new ZipItem("images/too-wide.png", pngBytes(2, 1))
        );

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archive)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rejectedRows").value(8))
                .andExpect(jsonPath("$.rows[0].errors", hasItem("SKU is duplicated in workbook")))
                .andExpect(jsonPath("$.rows[0].errors", hasItem("imageFile is duplicated in workbook")))
                .andExpect(jsonPath("$.rows[2].errors", hasItem("imageFile not found in ZIP")))
                .andExpect(jsonPath("$.rows[3].errors", hasItem("Image extension does not match file content")))
                .andExpect(jsonPath("$.rows[4].errors", hasItem("Only JPEG, PNG and WebP product images are supported")))
                .andExpect(jsonPath("$.rows[5].errors", hasItem("Image file max size is 1000 bytes")))
                .andExpect(jsonPath("$.rows[6].errors", hasItem("Image dimensions max are 1x1 px")));
    }

    @Test
    void previewShouldRejectInvalidWebpMismatchesUnsupportedFormatsAndOversizedDimensions() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long falseWebpProductId = createCatalogProduct(adminToken, suffix + "fw", BigDecimal.valueOf(10.00));
        long webpWithPngProductId = createCatalogProduct(adminToken, suffix + "wp", BigDecimal.valueOf(10.00));
        long pngWithWebpProductId = createCatalogProduct(adminToken, suffix + "pw", BigDecimal.valueOf(10.00));
        long jpgWithWebpProductId = createCatalogProduct(adminToken, suffix + "jw", BigDecimal.valueOf(10.00));
        long gifProductId = createCatalogProduct(adminToken, suffix + "gf", BigDecimal.valueOf(10.00));
        long avifProductId = createCatalogProduct(adminToken, suffix + "av", BigDecimal.valueOf(10.00));
        long wideWebpProductId = createCatalogProduct(adminToken, suffix + "ww", BigDecimal.valueOf(10.00));
        long truncatedWebpProductId = createCatalogProduct(adminToken, suffix + "tr", BigDecimal.valueOf(10.00));
        createDraftProfile(falseWebpProductId);
        createDraftProfile(webpWithPngProductId);
        createDraftProfile(pngWithWebpProductId);
        createDraftProfile(jpgWithWebpProductId);
        createDraftProfile(gifProductId);
        createDraftProfile(avifProductId);
        createDraftProfile(wideWebpProductId);
        createDraftProfile(truncatedWebpProductId);

        MockMultipartFile workbook = workbookFile(new String[][]{
                {productSku(suffix + "fw"), "images/not-webp.webp", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "wp"), "images/png-content.webp", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "pw"), "images/webp-content.png", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "jw"), "images/webp-content.jpg", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "gf"), "images/animated.gif", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "av"), "images/picture.avif", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "ww"), "images/too-wide.webp", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "tr"), "images/truncated.webp", "Alt", "OWN", "true", "", "0", "", "", "", ""}
        });
        MockMultipartFile archive = archiveFile(
                new ZipItem("images/not-webp.webp", new byte[]{1, 2, 3, 4}),
                new ZipItem("images/png-content.webp", pngBytes(1, 1)),
                new ZipItem("images/webp-content.png", webpVp8Bytes(1, 1)),
                new ZipItem("images/webp-content.jpg", webpVp8Bytes(1, 1)),
                new ZipItem("images/animated.gif", gifBytes()),
                new ZipItem("images/picture.avif", avifBytes()),
                new ZipItem("images/too-wide.webp", webpVp8xBytes(2, 1)),
                new ZipItem("images/truncated.webp", truncatedWebpAfterImageChunkBytes())
        );

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                .file(archive)
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rejectedRows").value(8))
                .andExpect(jsonPath("$.rows[0].errors", hasItem("Only JPEG, PNG and WebP product images are supported")))
                .andExpect(jsonPath("$.rows[1].errors", hasItem("Image extension does not match file content")))
                .andExpect(jsonPath("$.rows[2].errors", hasItem("Image extension does not match file content")))
                .andExpect(jsonPath("$.rows[3].errors", hasItem("Image extension does not match file content")))
                .andExpect(jsonPath("$.rows[4].errors", hasItem("Only .jpg, .jpeg, .png and .webp image files are supported")))
                .andExpect(jsonPath("$.rows[5].errors", hasItem("Only .jpg, .jpeg, .png and .webp image files are supported")))
                .andExpect(jsonPath("$.rows[6].errors", hasItem("Image dimensions max are 1x1 px")))
                .andExpect(jsonPath("$.rows[7].errors", hasItem("Image file is invalid")));
    }

    @Test
    void previewShouldRejectUnsafeZipAndDuplicatedEntries() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        MockMultipartFile workbook = workbookFile(new String[][]{{"SKU-ANY", "images/a.png", "Alt", "OWN", "true", "", "0", "", "", "", ""}});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archiveFile(new ZipItem("../evil.png", pngBytes(1, 1))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archiveFile(new ZipItem("/absolute.png", pngBytes(1, 1))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archiveFile(new ZipItem("images\\backslash.png", pngBytes(1, 1))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archiveFile(new ZipItem("C:/drive.png", pngBytes(1, 1))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archiveFile(new ZipItem("images/empty.png", new byte[0])))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archiveFile(new ZipItem("images/a.png", pngBytes(1, 1)), new ZipItem("IMAGES/A.PNG", pngBytes(1, 1))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publishedProfileShouldRequireExplicitConfirmationBeforeBinaryUpdate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "pub", BigDecimal.valueOf(10.00));
        long categoryId = createOnlineCategory(adminToken, "Categoria Bin " + suffix, "cat-bin-" + suffix);
        publishProfile(productId, suffix, categoryId);

        MockMultipartFile workbook = workbookFile(new String[][]{{
                productSku(suffix + "pub"),
                "images/published.png",
                "Published binary alt",
                "OWN",
                "true",
                "",
                "0",
                "",
                "",
                "",
                ""
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/preview")
                        .file(workbook)
                        .file(archiveFile(new ZipItem("images/published.png", pngBytes(1, 1))))
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].errors", hasItem("Published profile update requires explicit confirmation")));
    }

    private MockMultipartFile workbookFile(String[][] dataRows) throws Exception {
        return new MockMultipartFile(
                "workbook",
                "primary-images-binary.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                workbookBytes(dataRows)
        );
    }

    private byte[] workbookBytes(String[][] dataRows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("primary_images_binary");
            Row header = sheet.createRow(0);
            String[] headers = {
                    "sku",
                    "imageFile",
                    "altText",
                    "source",
                    "rightsConfirmed",
                    "assetType",
                    "displayOrder",
                    "publishedUpdateConfirmed",
                    "productName",
                    "publicationStatus",
                    "currentImageUrl"
            };
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
            return outputStream.toByteArray();
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

    private byte[] pngBytes(int width, int height) throws Exception {
        return imageBytes(width, height, "png");
    }

    private byte[] jpegBytes(int width, int height) throws Exception {
        return imageBytes(width, height, "jpg");
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

    private byte[] webpVp8lBytes(int width, int height) {
        return riffWebpChunk("VP8L", webpVp8lData(width, height));
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

    private byte[] gifBytes() {
        return new byte[]{'G', 'I', 'F', '8', '9', 'a', 1, 0, 1, 0};
    }

    private byte[] avifBytes() {
        return new byte[]{0, 0, 0, 24, 'f', 't', 'y', 'p', 'a', 'v', 'i', 'f'};
    }

    private byte[] truncatedWebpAfterImageChunkBytes() {
        byte[] bytes = java.util.Arrays.copyOf(webpVp8Bytes(1, 1), 34);
        writeIntLittleEndian(bytes, 4, 26);
        bytes[30] = 'B';
        bytes[31] = 'A';
        bytes[32] = 'D';
        bytes[33] = '!';
        return bytes;
    }

    private byte[] imageBytes(int width, int height, String format) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            ImageIO.write(image, format, outputStream);
            return outputStream.toByteArray();
        }
    }

    private byte[] appendBytes(byte[] bytes, int extraBytes) {
        byte[] result = new byte[bytes.length + extraBytes];
        System.arraycopy(bytes, 0, result, 0, bytes.length);
        return result;
    }

    private long createCatalogProduct(String adminToken, String suffix, BigDecimal salePrice) throws Exception {
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        return createProduct(adminToken, categoryId, unitId, suffix, salePrice);
    }

    private void createDraftProfile(Long productId) {
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
    }

    private void publishProfile(long productId, String suffix, long categoryId) {
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        ecommerceCatalogUseCase.updateProfile(new UpdateProductOnlineProfileCommand(
                productId,
                "publicado-bin-" + suffix,
                "Publicado Bin " + suffix,
                "Descripcion publicada completa " + suffix,
                categoryId,
                null,
                BrandAbsencePolicy.UNBRANDED
        ));
        ecommerceCatalogUseCase.upsertSeoMetadata(new UpsertProductSeoMetadataCommand(
                productId,
                "SEO title " + suffix,
                "SEO description " + suffix,
                "/productos/publicado-bin-" + suffix,
                RobotsPolicy.INDEX_FOLLOW,
                true,
                null,
                null,
                null
        ));
        ecommerceCatalogUseCase.upsertPrimaryProductAsset(assetCommand(productId, "/images/products/published-old-" + suffix + ".jpg", "Published old alt", AssetSource.OWN, 0));
        ecommerceCatalogUseCase.publish(productId);
    }

    private UpsertProductAssetCommand assetCommand(long productId, String assetUrl, String altText, AssetSource source, int displayOrder) {
        return new UpsertProductAssetCommand(
                productId,
                AssetType.PRODUCT_IMAGE,
                assetUrl,
                altText,
                source,
                true,
                displayOrder
        );
    }

    private long createOnlineCategory(String token, String name, String slug) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
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

    private String productSku(String suffix) {
        return "SKU-IT-" + suffix;
    }

    private record ZipItem(String name, byte[] bytes) {
    }

    private record WebpChunk(String fourCc, byte[] data) {
    }
}
