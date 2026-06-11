package com.erppos.backend.erp.ecommerce.adapter.dto;

import java.util.List;

public record EcommerceOnlineProfileImportPreviewResponse(
        int totalRows,
        int createRows,
        int updateRows,
        int unchangedRows,
        int rejectedRows,
        List<EcommerceOnlineProfileImportPreviewRowResponse> rows
) {
}
