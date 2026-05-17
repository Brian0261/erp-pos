package com.erppos.backend.erp.catalog.infrastructure.imports;

import com.erppos.backend.erp.catalog.application.port.ProductImportWorkbookPort;
import com.erppos.backend.erp.catalog.application.usecase.ProductImportUseCase;
import org.apache.poi.ss.usermodel.*;
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
public class PoiProductImportWorkbookAdapter implements ProductImportWorkbookPort {
    private static final List<String> HEADERS = List.of("sku", "barcode", "name", "description", "category", "unit", "salePrice", "active");
    private static final List<String> NORMALIZED_HEADERS = HEADERS.stream().map(header -> header.toLowerCase(Locale.ROOT)).toList();

    @Override
    public byte[] createTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("products");
            Row header = sheet.createRow(0);
            for (int index = 0; index < HEADERS.size(); index++) {
                header.createCell(index).setCellValue(HEADERS.get(index));
                sheet.setColumnWidth(index, 20 * 256);
            }
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate import template");
        }
    }

    @Override
    public List<ProductImportUseCase.ParsedRow> parse(byte[] content) {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            Sheet sheet = workbook.getNumberOfSheets() == 0 ? null : workbook.getSheetAt(0);
            if (sheet == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excel file has no sheets");
            }
            Map<String, Integer> headerIndex = readHeaderIndex(sheet.getRow(0));
            List<ProductImportUseCase.ParsedRow> rows = new ArrayList<>();
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row, headerIndex.size())) {
                    continue;
                }
                rows.add(new ProductImportUseCase.ParsedRow(
                        rowIndex + 1,
                        readCell(row, headerIndex.get("sku")),
                        readCell(row, headerIndex.get("barcode")),
                        readCell(row, headerIndex.get("name")),
                        readCell(row, headerIndex.get("description")),
                        readCell(row, headerIndex.get("category")),
                        readCell(row, headerIndex.get("unit")),
                        readCell(row, headerIndex.get("saleprice")),
                        readCell(row, headerIndex.get("active"))
                ));
            }
            return rows;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid .xlsx file");
        }
    }

    private Map<String, Integer> readHeaderIndex(Row headerRow) {
        if (headerRow == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template header is missing");
        }
        Map<String, Integer> headerIndex = new LinkedHashMap<>();
        for (int index = 0; index < HEADERS.size(); index++) {
            String value = normalizeHeader(readCell(headerRow, index));
            if (!NORMALIZED_HEADERS.get(index).equals(value)) {
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
}
