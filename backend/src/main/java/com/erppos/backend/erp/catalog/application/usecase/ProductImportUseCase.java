package com.erppos.backend.erp.catalog.application.usecase;

import java.util.List;

public interface ProductImportUseCase {
    byte[] downloadTemplate();

    PreviewResult preview(String originalFilename, byte[] content);

    ConfirmResult confirm(ConfirmCommand command);

    record ParsedRow(
            int rowNumber,
            String sku,
            String barcode,
            String name,
            String description,
            String category,
            String unit,
            String salePrice,
            String active
    ) {
    }

    record ImportRowCommand(
            int rowNumber,
            String sku,
            String barcode,
            String name,
            String description,
            String category,
            String unit,
            String salePrice,
            String active
    ) {
    }

    record ConfirmCommand(List<ImportRowCommand> rows) {
    }

    record PreviewRow(
            int rowNumber,
            String sku,
            String barcode,
            String name,
            String description,
            String category,
            String unit,
            String salePrice,
            String active,
            boolean valid,
            List<String> errors
    ) {
    }

    record PreviewResult(int totalRows, int validRows, int invalidRows, List<PreviewRow> rows) {
    }

    record ConfirmRowResult(int rowNumber, String sku, boolean created, Long productId, List<String> errors) {
    }

    record ConfirmResult(int totalRows, int createdRows, int rejectedRows, List<ConfirmRowResult> rows) {
    }
}
