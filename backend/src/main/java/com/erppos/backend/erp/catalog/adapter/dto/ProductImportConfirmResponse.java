package com.erppos.backend.erp.catalog.adapter.dto;

import java.util.List;

public record ProductImportConfirmResponse(
        int totalRows,
        int createdRows,
        int rejectedRows,
        List<ProductImportConfirmRowResponse> rows
) {
}
