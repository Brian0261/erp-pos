package com.erppos.backend.erp.ecommerce.adapter.dto;

import java.util.List;

public record EcommerceOnlineProfileImportConfirmResponse(
        int totalRows,
        int createdRows,
        int updatedRows,
        int unchangedRows,
        int rejectedRows,
        List<EcommerceOnlineProfileImportConfirmRowResponse> rows
) {
}
