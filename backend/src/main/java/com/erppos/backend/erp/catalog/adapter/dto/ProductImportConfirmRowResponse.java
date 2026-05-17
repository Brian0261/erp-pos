package com.erppos.backend.erp.catalog.adapter.dto;

import java.util.List;

public record ProductImportConfirmRowResponse(
        int rowNumber,
        String sku,
        boolean created,
        Long productId,
        List<String> errors
) {
}
