package com.erppos.backend.erp.ecommerce.infrastructure.imports;

import com.erppos.backend.erp.ecommerce.application.port.EcommercePrimaryImageBinaryImportWorkbookPort;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageBinaryImportUseCase;
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
public class PoiEcommercePrimaryImageBinaryImportWorkbookAdapter implements EcommercePrimaryImageBinaryImportWorkbookPort {
    private static final List<String> HEADERS = List.of(
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
    );
    private static final List<String> REQUIRED_HEADERS = List.of(
            "sku",
            "imagefile",
            "alttext",
            "source",
            "rightsconfirmed"
    );

    @Override
    public byte[] createTemplate(EcommercePrimaryImageBinaryImportUseCase.TemplateData data) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            createImportSheet(workbook, data.rows());
            createInstructionsSheet(workbook, data.instructions());
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate primary image binary import template");
        }
    }

    @Override
    public List<EcommercePrimaryImageBinaryImportUseCase.ParsedRow> parse(byte[] content) {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            Sheet sheet = workbook.getNumberOfSheets() == 0 ? null : workbook.getSheetAt(0);
            if (sheet == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excel file has no sheets");
            }
            Map<String, Integer> headerIndex = readHeaderIndex(sheet.getRow(0));
            int inspectedColumns = headerIndex.values().stream().mapToInt(Integer::intValue).max().orElse(0) + 1;
            List<EcommercePrimaryImageBinaryImportUseCase.ParsedRow> rows = new ArrayList<>();
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row, inspectedColumns)) {
                    continue;
                }
                rows.add(new EcommercePrimaryImageBinaryImportUseCase.ParsedRow(
                        rowIndex + 1,
                        readCell(row, headerIndex.get("sku")),
                        readCell(row, headerIndex.get("imagefile")),
                        readCell(row, headerIndex.get("alttext")),
                        readCell(row, headerIndex.get("source")),
                        readCell(row, headerIndex.get("rightsconfirmed")),
                        readCell(row, headerIndex.get("assettype")),
                        readCell(row, headerIndex.get("displayorder")),
                        readCell(row, headerIndex.get("publishedupdateconfirmed")),
                        readCell(row, headerIndex.get("productname")),
                        readCell(row, headerIndex.get("publicationstatus")),
                        readCell(row, headerIndex.get("currentimageurl"))
                ));
            }
            return rows;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid .xlsx file");
        }
    }

    private void createImportSheet(Workbook workbook, List<EcommercePrimaryImageBinaryImportUseCase.TemplateRow> rows) {
        Sheet sheet = workbook.createSheet("primary_images_binary");
        writeHeader(sheet.createRow(0), HEADERS);
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            EcommercePrimaryImageBinaryImportUseCase.TemplateRow source = rows.get(rowIndex);
            Row row = sheet.createRow(rowIndex + 1);
            row.createCell(0).setCellValue(nullToBlank(source.sku()));
            row.createCell(1).setCellValue(nullToBlank(source.imageFile()));
            row.createCell(2).setCellValue(nullToBlank(source.altText()));
            row.createCell(3).setCellValue(nullToBlank(source.source()));
            row.createCell(4).setCellValue(nullToBlank(source.rightsConfirmed()));
            row.createCell(5).setCellValue(nullToBlank(source.assetType()));
            row.createCell(6).setCellValue(nullToBlank(source.displayOrder()));
            row.createCell(7).setCellValue(nullToBlank(source.publishedUpdateConfirmed()));
            row.createCell(8).setCellValue(nullToBlank(source.productName()));
            row.createCell(9).setCellValue(nullToBlank(source.publicationStatus()));
            row.createCell(10).setCellValue(nullToBlank(source.currentImageUrl()));
        }
        autosize(sheet, HEADERS.size());
    }

    private void createInstructionsSheet(Workbook workbook, List<String> instructions) {
        Sheet sheet = workbook.createSheet("instructions");
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("rule");
        for (int rowIndex = 0; rowIndex < instructions.size(); rowIndex++) {
            sheet.createRow(rowIndex + 1).createCell(0).setCellValue(instructions.get(rowIndex));
        }
        sheet.setColumnWidth(0, 120 * 256);
    }

    private void writeHeader(Row row, List<String> headers) {
        for (int index = 0; index < headers.size(); index++) {
            row.createCell(index).setCellValue(headers.get(index));
        }
    }

    private void autosize(Sheet sheet, int columnCount) {
        for (int index = 0; index < columnCount; index++) {
            sheet.setColumnWidth(index, 28 * 256);
        }
    }

    private Map<String, Integer> readHeaderIndex(Row headerRow) {
        if (headerRow == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template header is missing");
        }
        Map<String, Integer> headerIndex = new LinkedHashMap<>();
        for (int index = 0; index < headerRow.getLastCellNum(); index++) {
            String value = normalizeHeader(readCell(headerRow, index));
            if (!value.isBlank()) {
                headerIndex.putIfAbsent(value, index);
            }
        }
        for (String requiredHeader : REQUIRED_HEADERS) {
            if (!headerIndex.containsKey(requiredHeader)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid template header");
            }
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

    private String readCell(Row row, Integer cellIndex) {
        if (cellIndex == null) {
            return "";
        }
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
