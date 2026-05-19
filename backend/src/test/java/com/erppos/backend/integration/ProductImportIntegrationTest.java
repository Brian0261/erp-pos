package com.erppos.backend.integration;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductImportIntegrationTest extends AbstractHttpIntegrationTest {

    @Test
    void shouldDownloadTemplate() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        mockMvc.perform(get("/api/v1/products/import/template")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, org.hamcrest.Matchers.containsString("products-import-template.xlsx")));
    }

    @Test
    void shouldPreviewValidRowsWithoutCreatingProducts() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        createCategory(adminToken, suffix);
        createUnit(adminToken, suffix);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "products.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                workbookBytes(new String[][]{{
                        "SKU-IMP-" + suffix,
                        "BC-IMP-" + suffix,
                        "Producto Importado " + suffix,
                        "Sin stock",
                        "CAT-IT-" + suffix,
                        "UIT" + suffix,
                        "12.50",
                        "true"
                }})
        );

        mockMvc.perform(multipart("/api/v1/products/import/preview")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.validRows").value(1))
                .andExpect(jsonPath("$.invalidRows").value(0));

        mockMvc.perform(get("/api/v1/products/search")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("q", "SKU-IMP-" + suffix))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void shouldReturnRowErrorsInPreview() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        createCategory(adminToken, suffix);
        createUnit(adminToken, suffix);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "products.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                workbookBytes(new String[][]{{
                        "",
                        "",
                        "",
                        "",
                        "NO-EXISTE",
                        "BAD",
                        "-1",
                        "quizas"
                }})
        );

        mockMvc.perform(multipart("/api/v1/products/import/preview")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invalidRows").value(1))
                .andExpect(jsonPath("$.rows[0].errors").isArray());
    }

    @Test
    void shouldConfirmAndCreateProducts() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        createCategory(adminToken, suffix);
        createUnit(adminToken, suffix);

        ObjectNode row = objectMapper.createObjectNode();
        row.put("rowNumber", 2);
        row.put("sku", "SKU-CONF-" + suffix);
        row.putNull("barcode");
        row.put("name", "Producto Confirmado " + suffix);
        row.putNull("description");
        row.put("category", "CAT-IT-" + suffix);
        row.put("unit", "UIT" + suffix);
        row.put("salePrice", "15.25");
        row.put("active", "true");
        ArrayNode rows = objectMapper.createArrayNode().add(row);
        ObjectNode payload = objectMapper.createObjectNode().set("rows", rows);

        mockMvc.perform(post("/api/v1/products/import/confirm")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rows[0].created").value(true));
    }

    @Test
    void shouldConfirmFileAndCreateProducts() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        createCategory(adminToken, suffix);
        createUnit(adminToken, suffix);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "products.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                workbookBytes(new String[][]{{
                        "SKU-CONF-FILE-" + suffix,
                        "BC-CONF-FILE-" + suffix,
                        "Producto Confirmado File " + suffix,
                        "Sin stock",
                        "CAT-IT-" + suffix,
                        "UIT" + suffix,
                        "18.50",
                        "true"
                }})
        );

        mockMvc.perform(multipart("/api/v1/products/import/confirm-file")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(1))
                .andExpect(jsonPath("$.rows[0].created").value(true));
    }

    @Test
    void shouldRejectExistingSkuDuringConfirmRevalidation() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String suffix = Long.toString(System.nanoTime());
        long categoryId = createCategory(adminToken, suffix);
        long unitId = createUnit(adminToken, suffix);
        createProduct(adminToken, categoryId, unitId, "EXIST-" + suffix, BigDecimal.ONE);

        ObjectNode row = objectMapper.createObjectNode();
        row.put("rowNumber", 2);
        row.put("sku", "SKU-IT-EXIST-" + suffix);
        row.putNull("barcode");
        row.put("name", "Producto Confirmado " + suffix);
        row.putNull("description");
        row.put("category", "CAT-IT-" + suffix);
        row.put("unit", "UIT" + suffix);
        row.put("salePrice", "15.25");
        row.put("active", "true");
        ArrayNode rows = objectMapper.createArrayNode().add(row);
        ObjectNode payload = objectMapper.createObjectNode().set("rows", rows);

        mockMvc.perform(post("/api/v1/products/import/confirm")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdRows").value(0))
                .andExpect(jsonPath("$.rows[0].errors[0]").value("SKU already exists"));
    }

    @Test
    void shouldForbidNonAdminImport() throws Exception {
        String supervisorToken = login(SUPERVISOR_EMAIL, SUPERVISOR_PASSWORD);

        mockMvc.perform(get("/api/v1/products/import/template")
                        .header(HttpHeaders.AUTHORIZATION, bearer(supervisorToken)))
                .andExpect(status().isForbidden());
    }

    private byte[] workbookBytes(String[][] dataRows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("products");
            Row header = sheet.createRow(0);
            String[] headers = {"sku", "barcode", "name", "description", "category", "unit", "salePrice", "active"};
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
}
