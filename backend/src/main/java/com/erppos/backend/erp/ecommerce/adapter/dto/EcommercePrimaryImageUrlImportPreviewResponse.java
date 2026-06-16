package com.erppos.backend.erp.ecommerce.adapter.dto;

import java.util.List;

public record EcommercePrimaryImageUrlImportPreviewResponse(
        int totalRows,
        int createRows,
        int updateRows,
        int unchangedRows,
        int rejectedRows,
        int warningRows,
        List<EcommercePrimaryImageUrlImportPreviewRowResponse> rows
) {
}
