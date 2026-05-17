package com.erppos.backend.erp.catalog.adapter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductImportConfirmRowRequest(
        @NotNull(message = "rowNumber is required")
        @Min(value = 2, message = "rowNumber must be >= 2")
        Integer rowNumber,
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
