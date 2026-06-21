package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductAssetCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductSeoMetadataCommand;
import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantFormat;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantPurpose;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.erppos.backend.erp.ecommerce.domain.port.ProductAssetRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantEntity;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantJpaRepository;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EcommercePrimaryImageUrlImportIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

    @Autowired
    private ProductAssetRepositoryPort productAssetRepositoryPort;

    @Autowired
    private ProductAssetVariantJpaRepository productAssetVariantJpaRepository;

    @Test
    void shouldDownloadPrimaryImageUrlTemplate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/template")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("ecommerce-primary-images-url-import-template.xlsx")));
    }

    @Test
    void previewShouldCreateUpdateNoChangeAndNotPersist() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long createProductId = createCatalogProduct(adminToken, suffix + "create", BigDecimal.valueOf(10.00));
        long updateProductId = createCatalogProduct(adminToken, suffix + "update", BigDecimal.valueOf(11.00));
        long unchangedProductId = createCatalogProduct(adminToken, suffix + "same", BigDecimal.valueOf(12.00));
        createDraftProfile(createProductId);
        createDraftProfile(updateProductId);
        createDraftProfile(unchangedProductId);
        ecommerceCatalogUseCase.upsertPrimaryProductAsset(assetCommand(updateProductId, "/images/products/old-" + suffix + ".jpg", "Old alt", AssetSource.OWN, 0));
        ecommerceCatalogUseCase.upsertPrimaryProductAsset(assetCommand(unchangedProductId, "/images/products/same-" + suffix + ".jpg", "Same alt", AssetSource.SUPPLIER, 2));

        MockMultipartFile file = workbookFile(new String[][]{
                {productSku(suffix + "create"), "/images/products/new-" + suffix + ".jpg", "New alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "update"), "/images/products/updated-" + suffix + ".jpg", "Updated alt", "OTHER", "true", "PRODUCT_IMAGE", "1", "", "", "", ""},
                {productSku(suffix + "same"), "/images/products/same-" + suffix + ".jpg", "Same alt", "SUPPLIER", "true", "PRODUCT_IMAGE", "2", "", "", "", ""}
        });

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createRows").value(1))
                .andExpect(jsonPath("$.updateRows").value(1))
                .andExpect(jsonPath("$.unchangedRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.warningRows").value(2))
                .andExpect(jsonPath("$.rows[0].action").value("CREATE"))
                .andExpect(jsonPath("$.rows[1].action").value("UPDATE"))
                .andExpect(jsonPath("$.rows[1].warnings", hasItem("Sobrescribira imagen principal existente.")))
                .andExpect(jsonPath("$.rows[2].action").value("NO_CHANGE"));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", createProductId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryAsset").doesNotExist());
        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", updateProductId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryAsset.assetUrl").value("/images/products/old-" + suffix + ".jpg"));
    }

    @Test
    void confirmFileShouldApplyValidRowsOnlyAndKeepErpProductUntouched() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.valueOf(19.90));
        createDraftProfile(productId);

        MockMultipartFile file = workbookFile(new String[][]{
                {productSku(suffix), "/images/products/imported-" + suffix + ".jpg", "Imported alt", "SUPPLIER", "true", "", "3", "", "", "", ""},
                {"SKU-NO-EXISTE-IMG-" + suffix, "/images/products/missing.jpg", "Missing alt", "OWN", "true", "", "0", "", "", "", ""}
        });

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.updatedRows").value(0))
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].applied").value(true))
                .andExpect(jsonPath("$.rows[1].applied").value(false))
                .andExpect(jsonPath("$.rows[1].errors", hasItem("SKU not found")));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryAsset.assetType").value("PRODUCT_IMAGE"))
                .andExpect(jsonPath("$.primaryAsset.assetUrl").value("/images/products/imported-" + suffix + ".jpg"))
                .andExpect(jsonPath("$.primaryAsset.altText").value("Imported alt"))
                .andExpect(jsonPath("$.primaryAsset.source").value("SUPPLIER"))
                .andExpect(jsonPath("$.primaryAsset.rightsConfirmed").value(true))
                .andExpect(jsonPath("$.primaryAsset.displayOrder").value(3))
                .andExpect(jsonPath("$.primaryAsset.storageProvider").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.storageKey").doesNotExist());

        mockMvc.perform(get("/api/v1/products/{id}", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value(productSku(suffix)))
                .andExpect(jsonPath("$.categoryId").value(categoryId))
                .andExpect(jsonPath("$.unitId").value(unitId))
                .andExpect(jsonPath("$.salePrice").value(19.90));
    }

    @Test
    void confirmFileUpdateShouldDeactivateStaleWebpVariantForUpdatedAssetOnly() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long updateProductId = createCatalogProduct(adminToken, suffix + "updvar", BigDecimal.valueOf(10.00));
        long otherProductId = createCatalogProduct(adminToken, suffix + "othvar", BigDecimal.valueOf(11.00));
        createDraftProfile(updateProductId);
        createDraftProfile(otherProductId);
        ProductAsset updateAsset = ecommerceCatalogUseCase.upsertPrimaryProductAsset(assetCommand(
                updateProductId,
                "/images/products/old-" + suffix + ".jpg",
                "Old alt",
                AssetSource.OWN,
                0
        ));
        ProductAsset otherAsset = ecommerceCatalogUseCase.upsertPrimaryProductAsset(assetCommand(
                otherProductId,
                "/images/products/other-" + suffix + ".jpg",
                "Other alt",
                AssetSource.OWN,
                0
        ));
        ProductAssetVariantEntity staleVariant = productAssetVariantJpaRepository.saveAndFlush(validVariant(updateAsset.id(), suffix + "-stale"));
        ProductAssetVariantEntity otherVariant = productAssetVariantJpaRepository.saveAndFlush(validVariant(otherAsset.id(), suffix + "-other"));

        MockMultipartFile file = workbookFile(new String[][]{{
                productSku(suffix + "updvar"),
                "/images/products/new-" + suffix + ".jpg",
                "New alt",
                "SUPPLIER",
                "true",
                "PRODUCT_IMAGE",
                "1",
                "",
                "",
                "",
                ""
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0));

        ProductAsset updatedAsset = productAssetRepositoryPort.findPrimaryActiveByProductOnlineProfileId(updateAsset.productOnlineProfileId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(updateAsset.id(), updatedAsset.id());
        org.junit.jupiter.api.Assertions.assertFalse(productAssetVariantJpaRepository.findById(staleVariant.getId()).orElseThrow().isActive());
        org.junit.jupiter.api.Assertions.assertFalse(productAssetVariantJpaRepository.findById(staleVariant.getId()).orElseThrow().isPreferred());
        org.junit.jupiter.api.Assertions.assertTrue(productAssetVariantJpaRepository.findById(otherVariant.getId()).orElseThrow().isActive());
        org.junit.jupiter.api.Assertions.assertTrue(productAssetVariantJpaRepository.findById(otherVariant.getId()).orElseThrow().isPreferred());
    }

    @Test
    void confirmFileNoChangeShouldKeepExistingWebpVariantActive() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "samevar", BigDecimal.valueOf(10.00));
        createDraftProfile(productId);
        ProductAsset asset = ecommerceCatalogUseCase.upsertPrimaryProductAsset(assetCommand(
                productId,
                "/images/products/same-" + suffix + ".jpg",
                "Same alt",
                AssetSource.SUPPLIER,
                2
        ));
        ProductAssetVariantEntity variant = productAssetVariantJpaRepository.saveAndFlush(validVariant(asset.id(), suffix + "-same"));

        MockMultipartFile file = workbookFile(new String[][]{{
                productSku(suffix + "samevar"),
                "/images/products/same-" + suffix + ".jpg",
                "Same alt",
                "SUPPLIER",
                "true",
                "PRODUCT_IMAGE",
                "2",
                "",
                "",
                "",
                ""
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedRows").value(0))
                .andExpect(jsonPath("$.unchangedRows").value(1))
                .andExpect(jsonPath("$.rows[0].action").value("NO_CHANGE"));

        ProductAssetVariantEntity current = productAssetVariantJpaRepository.findById(variant.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(current.isActive());
        org.junit.jupiter.api.Assertions.assertTrue(current.isPreferred());
    }

    @Test
    void previewShouldRejectInvalidRows() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "a", BigDecimal.valueOf(10.00));
        long badUrlProductId = createCatalogProduct(adminToken, suffix + "url", BigDecimal.valueOf(11.00));
        long displayOrderProductId = createCatalogProduct(adminToken, suffix + "ord", BigDecimal.valueOf(12.00));
        createDraftProfile(productId);
        createDraftProfile(badUrlProductId);
        createDraftProfile(displayOrderProductId);

        MockMultipartFile file = workbookFile(new String[][]{
                {productSku(suffix + "a"), "/images/products/a.jpg", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "a"), "/images/products/b.jpg", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "url"), "https://cdn.inktoy.pe/products/x.jpg", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "ord"), "/images/products/order.jpg", "Alt", "OWN", "true", "", "-1", "", "", "", ""},
                {"", "/images/products/no-sku.jpg", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {"SKU-NO-EXISTE-" + suffix, "/images/products/missing.jpg", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "url"), "", "Alt", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "ord"), "/images/products/no-alt.jpg", "", "OWN", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "url"), "/images/products/bad-source.jpg", "Alt", "BAD", "true", "", "0", "", "", "", ""},
                {productSku(suffix + "ord"), "/images/products/rights.jpg", "Alt", "OWN", "false", "", "0", "", "", "", ""},
                {productSku(suffix + "url"), "/images/products/logo.jpg", "Alt", "OWN", "true", "BRAND_LOGO", "0", "", "", "", ""}
        });

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rejectedRows").value(11))
                .andExpect(jsonPath("$.rows[0].errors", hasItem("SKU is duplicated in file")))
                .andExpect(jsonPath("$.rows[2].errors", hasItem("La URL de imagen no es publica o usa un dominio no permitido.")))
                .andExpect(jsonPath("$.rows[3].errors", hasItem("displayOrder is invalid")))
                .andExpect(jsonPath("$.rows[4].errors", hasItem("SKU is required")))
                .andExpect(jsonPath("$.rows[5].errors", hasItem("SKU not found")))
                .andExpect(jsonPath("$.rows[6].errors", hasItem("imageUrl is required")))
                .andExpect(jsonPath("$.rows[7].errors", hasItem("altText is required")))
                .andExpect(jsonPath("$.rows[8].errors", hasItem("source is invalid")))
                .andExpect(jsonPath("$.rows[9].errors", hasItem("rightsConfirmed must be true")))
                .andExpect(jsonPath("$.rows[10].errors", hasItem("assetType must be PRODUCT_IMAGE")));
    }

    @Test
    void publishedProfileShouldRequireExplicitConfirmationBeforeUpdate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "pub", BigDecimal.valueOf(10.00));
        long categoryId = createOnlineCategory(adminToken, "Categoria " + suffix, "cat-img-" + suffix);
        publishProfile(productId, suffix, categoryId);

        MockMultipartFile rejectedFile = workbookFile(new String[][]{{
                productSku(suffix + "pub"),
                "/images/products/published-new-" + suffix + ".jpg",
                "Published new alt",
                "OWN",
                "true",
                "",
                "0",
                "",
                "",
                "",
                ""
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview")
                        .file(rejectedFile)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].errors", hasItem("Published profile update requires explicit confirmation")));

        MockMultipartFile confirmedFile = workbookFile(new String[][]{{
                productSku(suffix + "pub"),
                "/images/products/published-new-" + suffix + ".jpg",
                "Published new alt",
                "OWN",
                "true",
                "",
                "0",
                "true",
                "",
                "",
                ""
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file")
                        .file(confirmedFile)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedRows").value(1))
                .andExpect(jsonPath("$.warningRows").value(1))
                .andExpect(jsonPath("$.rows[0].warnings", hasItem("Perfil publicado cambiara imagen visible publicamente.")));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationStatus").value("PUBLISHED"))
                .andExpect(jsonPath("$.primaryAsset.assetUrl").value("/images/products/published-new-" + suffix + ".jpg"));
    }

    @Test
    void publishedNoChangeShouldNotRequireExplicitConfirmation() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "pubsame", BigDecimal.valueOf(10.00));
        long categoryId = createOnlineCategory(adminToken, "Categoria Same " + suffix, "cat-img-same-" + suffix);
        publishProfile(productId, suffix, categoryId);

        MockMultipartFile file = workbookFile(new String[][]{{
                productSku(suffix + "pubsame"),
                "/images/products/published-old-" + suffix + ".jpg",
                "Published old alt",
                "OWN",
                "true",
                "PRODUCT_IMAGE",
                "0",
                "",
                "",
                "",
                ""
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedRows").value(0))
                .andExpect(jsonPath("$.unchangedRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.rows[0].action").value("NO_CHANGE"))
                .andExpect(jsonPath("$.rows[0].applied").value(true));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationStatus").value("PUBLISHED"))
                .andExpect(jsonPath("$.primaryAsset.assetUrl").value("/images/products/published-old-" + suffix + ".jpg"));
    }

    @Test
    void replacingStoredS3AssetShouldWarnAndLeaveUrlOnlyMetadata() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "s3", BigDecimal.valueOf(10.00));
        createDraftProfile(productId);
        ProductOnlineProfile profile = ecommerceCatalogUseCase.getProfileByProductId(productId);
        productAssetRepositoryPort.save(new ProductAsset(
                null,
                profile.id(),
                AssetType.PRODUCT_IMAGE,
                "https://cdn.inktoy.pe/products/s3-old-" + suffix + ".png",
                "Stored old alt",
                AssetSource.OWN,
                true,
                true,
                true,
                0,
                "S3",
                "inktoy-test-bucket",
                "ecommerce/products/" + productId + "/old.png",
                "image/png",
                10,
                20,
                1234L,
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                "old.png",
                null,
                null,
                "it",
                "it"
        ));

        MockMultipartFile file = workbookFile(new String[][]{{
                productSku(suffix + "s3"),
                "/images/products/url-only-" + suffix + ".jpg",
                "URL only alt",
                "SUPPLIER",
                "true",
                "PRODUCT_IMAGE",
                "4",
                "",
                "",
                "",
                ""
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.rows[0].warnings", hasItem("Si reemplaza un asset con metadata S3, la importacion URL-only limpiara metadata storage del asset, pero NO borrara el objeto S3 previo en esta fase.")));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryAsset.assetUrl").value("/images/products/url-only-" + suffix + ".jpg"))
                .andExpect(jsonPath("$.primaryAsset.altText").value("URL only alt"))
                .andExpect(jsonPath("$.primaryAsset.source").value("SUPPLIER"))
                .andExpect(jsonPath("$.primaryAsset.displayOrder").value(4))
                .andExpect(jsonPath("$.primaryAsset.storageProvider").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.storageBucket").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.storageKey").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.mimeType").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.width").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.height").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.sizeBytes").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.checksumSha256").doesNotExist())
                .andExpect(jsonPath("$.primaryAsset.originalFilename").doesNotExist());
    }

    @Test
    void shouldForbidSupervisorImport() throws Exception {
        String supervisorToken = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/template")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isForbidden());
    }

    private MockMultipartFile workbookFile(String[][] dataRows) throws Exception {
        return new MockMultipartFile(
                "file",
                "primary-images.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                workbookBytes(dataRows)
        );
    }

    private byte[] workbookBytes(String[][] dataRows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("primary_images");
            Row header = sheet.createRow(0);
            String[] headers = {
                    "sku",
                    "imageUrl",
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
                "publicado-img-" + suffix,
                "Publicado Imagen " + suffix,
                "Descripcion publicada completa " + suffix,
                categoryId,
                null,
                BrandAbsencePolicy.UNBRANDED
        ));
        ecommerceCatalogUseCase.upsertSeoMetadata(new UpsertProductSeoMetadataCommand(
                productId,
                "SEO title " + suffix,
                "SEO description " + suffix,
                "/productos/publicado-img-" + suffix,
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

    private ProductAssetVariantEntity validVariant(Long productAssetId, String keySuffix) {
        ProductAssetVariantEntity variant = new ProductAssetVariantEntity();
        variant.setProductAssetId(productAssetId);
        variant.setVariantKind(ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP);
        variant.setFormat(ProductAssetVariantFormat.WEBP);
        variant.setPurpose(ProductAssetVariantPurpose.PRIMARY);
        variant.setTargetWidth(96);
        variant.setSortOrder(0);
        variant.setAssetUrl("https://cdn.inktoy.pe/ecommerce/products/assets/" + productAssetId + "/" + keySuffix + ".webp");
        variant.setStorageProvider("S3");
        variant.setStorageBucket("inktoy-test-bucket");
        variant.setStorageKey("ecommerce/products/assets/" + productAssetId + "/variants/" + keySuffix + ".webp");
        variant.setMimeType("image/webp");
        variant.setWidth(96);
        variant.setHeight(72);
        variant.setSizeBytes(762L);
        variant.setChecksumSha256("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        variant.setSourceChecksumSha256("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789");
        variant.setActive(true);
        variant.setPreferred(true);
        variant.setCreatedBy("it");
        variant.setUpdatedBy("it");
        return variant;
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
}
