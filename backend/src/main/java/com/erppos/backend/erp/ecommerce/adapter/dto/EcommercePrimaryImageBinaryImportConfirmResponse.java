package com.erppos.backend.erp.ecommerce.adapter.dto;

import java.util.List;

public record EcommercePrimaryImageBinaryImportConfirmResponse(
        int totalRows,
        int createdRows,
        int updatedRows,
        int unchangedRows,
        int rejectedRows,
        int warningRows,
        List<EcommercePrimaryImageBinaryImportConfirmRowResponse> rows
) {
}
