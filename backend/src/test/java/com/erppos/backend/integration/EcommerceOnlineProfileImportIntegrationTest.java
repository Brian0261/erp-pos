package com.erppos.backend.integration;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.application.usecase.UpdateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductAssetCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.UpsertProductSeoMetadataCommand;
import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import com.fasterxml.jackson.databind.JsonNode;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EcommerceOnlineProfileImportIntegrationTest extends AbstractHttpIntegrationTest {

    @Autowired
    private EcommerceCatalogUseCase ecommerceCatalogUseCase;

    @Test
    void shouldDownloadPrefilledTemplate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/online-profiles/import/template")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("ecommerce-online-profiles-import-template.xlsx")));
    }

    @Test
    void previewShouldCreateRowsAndAutogenerateOnlineNameAndSlug() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix + "a", BigDecimal.valueOf(10.00));
        String sku = productSku(suffix + "a");

        MockMultipartFile file = workbookFile(new String[][]{{
                sku,
                "",
                "",
                "",
                "",
                "Descripcion ecommerce " + suffix,
                "",
                "",
                "UNBRANDED"
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/import/preview")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createRows").value(1))
                .andExpect(jsonPath("$.rejectedRows").value(0))
                .andExpect(jsonPath("$.rows[0].productName").value("Producto IT " + suffix + "a"))
                .andExpect(jsonPath("$.rows[0].onlineName").value("Producto IT " + suffix + "a"))
                .andExpect(jsonPath("$.rows[0].slug").value("producto-it-" + suffix + "a"))
                .andExpect(jsonPath("$.rows[0].generatedFields", hasItem("ONLINE_NAME")))
                .andExpect(jsonPath("$.rows[0].generatedFields", hasItem("SLUG")));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void previewShouldGenerateSlugFromExplicitOnlineName() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        createCatalogProduct(adminToken, suffix, BigDecimal.valueOf(10.00));

        MockMultipartFile file = workbookFile(new String[][]{{
                productSku(suffix),
                "",
                "",
                "Cuaderno A4 Rayado 80 hojas",
                "",
                "Descripcion ecommerce " + suffix,
                "",
                "",
                "UNBRANDED"
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/import/preview")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].slug").value("cuaderno-a4-rayado-80-hojas"))
                .andExpect(jsonPath("$.rows[0].generatedFields", hasItem("SLUG")));
    }

    @Test
    void previewShouldUpdateExistingNonPublishedProfile() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long productId = createCatalogProduct(adminToken, suffix, BigDecimal.valueOf(12.00));
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        ecommerceCatalogUseCase.updateProfile(new UpdateProductOnlineProfileCommand(
                productId,
                "perfil-previo-" + suffix,
                "Nombre previo " + suffix,
                "Descripcion previa " + suffix,
                null,
                null,
                null
        ));

        MockMultipartFile file = workbookFile(new String[][]{{
                productSku(suffix),
                "",
                "DRAFT",
                "Nombre actualizado " + suffix,
                "perfil-actualizado-" + suffix,
                "Descripcion actualizada " + suffix,
                "",
                "",
                "GENERIC"
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/import/preview")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updateRows").value(1))
                .andExpect(jsonPath("$.rows[0].action").value("UPDATE"))
                .andExpect(jsonPath("$.rows[0].valid").value(true));
    }

    @Test
    void previewShouldAdjustGeneratedSlugCollisionWithSkuSuffix() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long existingProductId = createCatalogProduct(adminToken, suffix + "old", BigDecimal.valueOf(10.00));
        createDraftProfile(existingProductId, "lapicero-azul", "Lapicero Azul", null, null, null);
        createCatalogProduct(adminToken, suffix + "new", BigDecimal.valueOf(11.00));

        MockMultipartFile file = workbookFile(new String[][]{{
                productSku(suffix + "new"),
                "",
                "",
                "Lapicero Azul",
                "",
                "Descripcion ecommerce " + suffix,
                "",
                "",
                "UNBRANDED"
        }});

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/import/preview")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].slug").value("lapicero-azul-sku-sku-it-" + suffix + "new"))
                .andExpect(jsonPath("$.rows[0].generatedFields", hasItem("SLUG_COLLISION_SUFFIX")));
    }

    @Test
    void previewShouldRejectInvalidRows() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long categoryId = createOnlineCategory(adminToken, "Categoria " + suffix, "cat-" + suffix);
        long inactiveCategoryId = createOnlineCategory(adminToken, "Categoria Inactiva " + suffix, "cat-inactiva-" + suffix);
        changeOnlineCategoryStatus(adminToken, inactiveCategoryId, false);
        long brandId = createBrand(adminToken, "Marca " + suffix, "marca-" + suffix);
        long inactiveBrandId = createBrand(adminToken, "Marca Inactiva " + suffix, "marca-inactiva-" + suffix);
        changeBrandStatus(adminToken, inactiveBrandId, false);

        long duplicateSlugProductId = createCatalogProduct(adminToken, suffix + "dup", BigDecimal.valueOf(10.00));
        createDraftProfile(duplicateSlugProductId, "slug-duplicado-" + suffix, "Duplicado " + suffix, categoryId, brandId, null);

        long publishedProductId = createCatalogProduct(adminToken, suffix + "pub", BigDecimal.valueOf(10.00));
        publishProfile(publishedProductId, suffix, categoryId, brandId);

        createCatalogProduct(adminToken, suffix + "a", BigDecimal.valueOf(10.00));
        createCatalogProduct(adminToken, suffix + "b", BigDecimal.valueOf(10.00));
        createCatalogProduct(adminToken, suffix + "cm", BigDecimal.valueOf(10.00));
        createCatalogProduct(adminToken, suffix + "ci", BigDecimal.valueOf(10.00));
        createCatalogProduct(adminToken, suffix + "bm", BigDecimal.valueOf(10.00));
        createCatalogProduct(adminToken, suffix + "bi", BigDecimal.valueOf(10.00));
        createCatalogProduct(adminToken, suffix + "co", BigDecimal.valueOf(10.00));
        createCatalogProduct(adminToken, suffix + "bp", BigDecimal.valueOf(10.00));
        createCatalogProduct(adminToken, suffix + "fb", BigDecimal.valueOf(10.00));
        long inactiveProductId = createCatalogProduct(adminToken, suffix + "ia", BigDecimal.valueOf(10.00));
        deactivateProduct(adminToken, inactiveProductId);

        MockMultipartFile file = workbookFile(new String[][]{
                {productSku(suffix + "a"), "", "", "Duplicado A", "dup-file-" + suffix, "Desc", "", "", "UNBRANDED"},
                {productSku(suffix + "a"), "", "", "Duplicado B", "dup-file-b-" + suffix, "Desc", "", "", "UNBRANDED"},
                {"SKU-NO-EXISTE-" + suffix, "", "", "No existe", "no-existe-" + suffix, "Desc", "", "", "UNBRANDED"},
                {"", "", "", "Sin sku", "sin-sku-" + suffix, "Desc", "", "", "UNBRANDED"},
                {productSku(suffix + "b"), "", "", "Slug duplicado", "slug-duplicado-" + suffix, "Desc", "", "", "UNBRANDED"},
                {productSku(suffix + "cm"), "", "", "Categoria missing", "cat-missing-" + suffix, "Desc", "cat-no-existe-" + suffix, "", "UNBRANDED"},
                {productSku(suffix + "ci"), "", "", "Categoria inactive", "cat-inactive-" + suffix, "Desc", "cat-inactiva-" + suffix, "", "UNBRANDED"},
                {productSku(suffix + "bm"), "", "", "Marca missing", "brand-missing-" + suffix, "Desc", "", "marca-no-existe-" + suffix, ""},
                {productSku(suffix + "bi"), "", "", "Marca inactive", "brand-inactive-" + suffix, "Desc", "", "marca-inactiva-" + suffix, ""},
                {productSku(suffix + "co"), "", "", "Marca combinada", "brand-combined-" + suffix, "Desc", "", "marca-" + suffix, "UNBRANDED"},
                {productSku(suffix + "bp"), "", "", "Politica mala", "bad-policy-" + suffix, "Desc", "", "", "INVALID"},
                {productSku(suffix + "fb"), "", "", "Slug prohibido", "demo-producto-" + suffix, "Desc", "", "", "UNBRANDED"},
                {productSku(suffix + "ia"), "", "", "Producto inactivo", "producto-inactivo-" + suffix, "Desc", "", "", "UNBRANDED"},
                {productSku(suffix + "pub"), "", "PUBLISHED", "Publicado", "publicado-editado-" + suffix, "Desc", "cat-" + suffix, "marca-" + suffix, ""}
        });

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/import/preview")
                .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rejectedRows").value(14))
                .andExpect(jsonPath("$.rows[0].errors", hasItem("SKU is duplicated in file")))
                .andExpect(jsonPath("$.rows[2].errors", hasItem("SKU not found")))
                .andExpect(jsonPath("$.rows[3].errors", hasItem("SKU is required")))
                .andExpect(jsonPath("$.rows[4].errors", hasItem("Slug already exists")))
                .andExpect(jsonPath("$.rows[5].errors", hasItem("Online category slug not found")))
                .andExpect(jsonPath("$.rows[6].errors", hasItem("Online category is inactive")))
                .andExpect(jsonPath("$.rows[7].errors", hasItem("Brand slug not found")))
                .andExpect(jsonPath("$.rows[8].errors", hasItem("Brand is inactive")))
                .andExpect(jsonPath("$.rows[9].errors", hasItem("brandSlug and brandAbsencePolicy cannot be combined")))
                .andExpect(jsonPath("$.rows[10].errors", hasItem("brandAbsencePolicy is invalid")))
                .andExpect(jsonPath("$.rows[11].errors", hasItem("Slug contains prohibited test/demo term")))
                .andExpect(jsonPath("$.rows[12].errors", hasItem("Product is inactive")))
                .andExpect(jsonPath("$.rows[13].errors", hasItem("Published profile cannot be changed by bulk import")));
    }

    @Test
    void confirmFileShouldApplyOnlyValidRowsAndNotModifyErpProduct() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime(), 36);
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        long productId = createProduct(adminToken, categoryId, unitId, suffix, BigDecimal.valueOf(19.90));

        MockMultipartFile file = workbookFile(new String[][]{
                {productSku(suffix), "", "", "Nombre ecommerce " + suffix, "", "Descripcion ecommerce " + suffix, "", "", "UNBRANDED"},
                {"SKU-NO-EXISTE-CONF-" + suffix, "", "", "No existe", "", "Desc", "", "", "UNBRANDED"}
        });

        mockMvc.perform(multipart("/api/v1/ecommerce-admin/products/online-profiles/import/confirm-file")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.updatedRows").value(0))
                .andExpect(jsonPath("$.rejectedRows").value(1))
                .andExpect(jsonPath("$.rows[0].applied").value(true))
                .andExpect(jsonPath("$.rows[1].applied").value(false));

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/{productId}/online-profile", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationStatus").value("DRAFT"))
                .andExpect(jsonPath("$.onlineName").value("Nombre ecommerce " + suffix))
                .andExpect(jsonPath("$.slug").value("nombre-ecommerce-" + suffix));

        mockMvc.perform(get("/api/v1/products/{id}", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value(productSku(suffix)))
                .andExpect(jsonPath("$.categoryId").value(categoryId))
                .andExpect(jsonPath("$.unitId").value(unitId))
                .andExpect(jsonPath("$.salePrice").value(19.90));
    }

    @Test
    void shouldForbidSupervisorImport() throws Exception {
        String supervisorToken = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);

        mockMvc.perform(get("/api/v1/ecommerce-admin/products/online-profiles/import/template")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isForbidden());
    }

    private MockMultipartFile workbookFile(String[][] dataRows) throws Exception {
        return new MockMultipartFile(
                "file",
                "online-profiles.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                workbookBytes(dataRows)
        );
    }

    private byte[] workbookBytes(String[][] dataRows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("online_profiles");
            Row header = sheet.createRow(0);
            String[] headers = {
                    "sku",
                    "productName",
                    "publicationStatus",
                    "onlineName",
                    "slug",
                    "onlineDescription",
                    "onlineCategorySlug",
                    "brandSlug",
                    "brandAbsencePolicy"
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

    private String productSku(String suffix) {
        return "SKU-IT-" + suffix;
    }

    private void createDraftProfile(Long productId, String slug, String onlineName, Long categoryId, Long brandId, String brandAbsencePolicy) {
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        ecommerceCatalogUseCase.updateProfile(new UpdateProductOnlineProfileCommand(
                productId,
                slug,
                onlineName,
                "Descripcion ecommerce",
                categoryId,
                brandId,
                brandAbsencePolicy == null ? null : com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy.valueOf(brandAbsencePolicy)
        ));
    }

    private void publishProfile(long productId, String suffix, long categoryId, long brandId) {
        ecommerceCatalogUseCase.createDraftProfile(new CreateProductOnlineProfileCommand(productId));
        ecommerceCatalogUseCase.updateProfile(new UpdateProductOnlineProfileCommand(
                productId,
                "publicado-" + suffix,
                "Publicado " + suffix,
                "Descripcion publicada completa " + suffix,
                categoryId,
                brandId,
                null
        ));
        ecommerceCatalogUseCase.upsertSeoMetadata(new UpsertProductSeoMetadataCommand(
                productId,
                "SEO title " + suffix,
                "SEO description " + suffix,
                "/productos/publicado-" + suffix,
                RobotsPolicy.INDEX_FOLLOW,
                true,
                null,
                null,
                null
        ));
        ecommerceCatalogUseCase.upsertPrimaryProductAsset(new UpsertProductAssetCommand(
                productId,
                AssetType.PRODUCT_IMAGE,
                "https://cdn.example.test/product-" + suffix + ".jpg",
                "Producto publicado " + suffix,
                AssetSource.OWN,
                true,
                0
        ));
        ecommerceCatalogUseCase.publish(productId);
    }

    private long createBrand(String token, String name, String slug) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("name", name);
        payload.put("slug", slug);
        payload.put("description", "Descripcion " + name);

        MvcResult result = mockMvc.perform(post("/api/v1/ecommerce-admin/brands")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn();

        return readJson(result).path("id").asLong();
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

    private void changeBrandStatus(String token, long brandId, boolean active) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("active", active);
        mockMvc.perform(patch("/api/v1/ecommerce-admin/brands/{id}/status", brandId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }

    private void changeOnlineCategoryStatus(String token, long categoryId, boolean active) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("active", active);
        mockMvc.perform(patch("/api/v1/ecommerce-admin/online-categories/{id}/status", categoryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk());
    }

    private void deactivateProduct(String token, long productId) throws Exception {
        mockMvc.perform(delete("/api/v1/products/{id}", productId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }
}
