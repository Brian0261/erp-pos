package com.erppos.backend.erp.ecommerce.infrastructure.imports;

import com.erppos.backend.erp.ecommerce.application.port.EcommerceOnlineProfileImportWorkbookPort;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceOnlineProfileImportUseCase;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class PoiEcommerceOnlineProfileImportWorkbookAdapter implements EcommerceOnlineProfileImportWorkbookPort {
    private static final List<String> PROFILE_HEADERS = List.of(
            "sku",
            "productName",
            "publicationStatus",
            "onlineName",
            "slug",
            "onlineDescription",
            "onlineCategorySlug",
            "brandSlug",
            "brandAbsencePolicy"
    );
    private static final List<String> NORMALIZED_PROFILE_HEADERS = PROFILE_HEADERS.stream()
            .map(header -> header.toLowerCase(Locale.ROOT))
            .toList();
    private static final List<String> REFERENCE_HEADERS = List.of("name", "slug", "active");

    @Override
    public byte[] createTemplate(EcommerceOnlineProfileImportUseCase.TemplateData data) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            createProfileSheet(workbook, data.profileRows());
            createReferenceSheet(workbook, "online_categories", data.onlineCategories());
            createReferenceSheet(workbook, "brands", data.brands());
            createInstructionsSheet(workbook, data.instructions());
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate ecommerce profile import template");
        }
    }

    @Override
    public List<EcommerceOnlineProfileImportUseCase.ParsedRow> parse(byte[] content) {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            Sheet sheet = workbook.getNumberOfSheets() == 0 ? null : workbook.getSheetAt(0);
            if (sheet == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excel file has no sheets");
            }
            Map<String, Integer> headerIndex = readHeaderIndex(sheet.getRow(0));
            List<EcommerceOnlineProfileImportUseCase.ParsedRow> rows = new ArrayList<>();
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row, headerIndex.size())) {
                    continue;
                }
                rows.add(new EcommerceOnlineProfileImportUseCase.ParsedRow(
                        rowIndex + 1,
                        readCell(row, headerIndex.get("sku")),
                        readCell(row, headerIndex.get("productname")),
                        readCell(row, headerIndex.get("publicationstatus")),
                        readCell(row, headerIndex.get("onlinename")),
                        readCell(row, headerIndex.get("slug")),
                        readCell(row, headerIndex.get("onlinedescription")),
                        readCell(row, headerIndex.get("onlinecategoryslug")),
                        readCell(row, headerIndex.get("brandslug")),
                        readCell(row, headerIndex.get("brandabsencepolicy"))
                ));
            }
            return rows;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid .xlsx file");
        }
    }

    private void createProfileSheet(Workbook workbook, List<EcommerceOnlineProfileImportUseCase.TemplateProfileRow> rows) {
        Sheet sheet = workbook.createSheet("online_profiles");
        writeHeader(sheet.createRow(0), PROFILE_HEADERS);
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            EcommerceOnlineProfileImportUseCase.TemplateProfileRow source = rows.get(rowIndex);
            Row row = sheet.createRow(rowIndex + 1);
            row.createCell(0).setCellValue(nullToBlank(source.sku()));
            row.createCell(1).setCellValue(nullToBlank(source.productName()));
            row.createCell(2).setCellValue(nullToBlank(source.publicationStatus()));
            row.createCell(3).setCellValue(nullToBlank(source.onlineName()));
            row.createCell(4).setCellValue(nullToBlank(source.slug()));
            row.createCell(5).setCellValue(nullToBlank(source.onlineDescription()));
            row.createCell(6).setCellValue(nullToBlank(source.onlineCategorySlug()));
            row.createCell(7).setCellValue(nullToBlank(source.brandSlug()));
            row.createCell(8).setCellValue(nullToBlank(source.brandAbsencePolicy()));
        }
        autosize(sheet, PROFILE_HEADERS.size());
    }

    private void createReferenceSheet(
            Workbook workbook,
            String name,
            List<EcommerceOnlineProfileImportUseCase.TemplateReferenceRow> rows
    ) {
        Sheet sheet = workbook.createSheet(name);
        writeHeader(sheet.createRow(0), REFERENCE_HEADERS);
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            EcommerceOnlineProfileImportUseCase.TemplateReferenceRow source = rows.get(rowIndex);
            Row row = sheet.createRow(rowIndex + 1);
            row.createCell(0).setCellValue(nullToBlank(source.name()));
            row.createCell(1).setCellValue(nullToBlank(source.slug()));
            row.createCell(2).setCellValue(Boolean.toString(source.active()));
        }
        autosize(sheet, REFERENCE_HEADERS.size());
    }

    private void createInstructionsSheet(Workbook workbook, List<String> instructions) {
        Sheet sheet = workbook.createSheet("instructions");
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("rule");
        for (int rowIndex = 0; rowIndex < instructions.size(); rowIndex++) {
            sheet.createRow(rowIndex + 1).createCell(0).setCellValue(instructions.get(rowIndex));
        }
        sheet.setColumnWidth(0, 100 * 256);
    }

    private void writeHeader(Row row, List<String> headers) {
        for (int index = 0; index < headers.size(); index++) {
            row.createCell(index).setCellValue(headers.get(index));
        }
    }

    private void autosize(Sheet sheet, int columnCount) {
        for (int index = 0; index < columnCount; index++) {
            sheet.setColumnWidth(index, 24 * 256);
        }
    }

    private Map<String, Integer> readHeaderIndex(Row headerRow) {
        if (headerRow == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template header is missing");
        }
        Map<String, Integer> headerIndex = new LinkedHashMap<>();
        for (int index = 0; index < PROFILE_HEADERS.size(); index++) {
            String value = normalizeHeader(readCell(headerRow, index));
            if (!NORMALIZED_PROFILE_HEADERS.get(index).equals(value)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid template header");
            }
            headerIndex.put(value, index);
        }
        return headerIndex;
    }

    private boolean isBlankRow(Row row, int columnCount) {
        for (int index = 0; index < columnCount; index++) {
            if (!readCell(row, index).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String readCell(Row row, int cellIndex) {
        Cell cell = row.getCell(cellIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case BOOLEAN -> Boolean.toString(cell.getBooleanCellValue());
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
            case FORMULA -> readFormulaCell(cell);
            case BLANK, _NONE, ERROR -> "";
        };
    }

    private String readFormulaCell(Cell cell) {
        return switch (cell.getCachedFormulaResultType()) {
            case STRING -> cell.getStringCellValue();
            case BOOLEAN -> Boolean.toString(cell.getBooleanCellValue());
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
            default -> "";
        };
    }

    private String normalizeHeader(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }
}
