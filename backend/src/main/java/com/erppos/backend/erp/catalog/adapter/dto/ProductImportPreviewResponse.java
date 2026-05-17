package com.erppos.backend.erp.catalog.adapter.dto;

import java.util.List;

public record ProductImportPreviewResponse(
        int totalRows,
        int validRows,
        int invalidRows,
        List<ProductImportPreviewRowResponse> rows
) {
}
