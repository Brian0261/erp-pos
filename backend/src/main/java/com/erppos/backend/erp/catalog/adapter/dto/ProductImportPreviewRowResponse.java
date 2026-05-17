package com.erppos.backend.erp.catalog.adapter.dto;

import java.util.List;

public record ProductImportPreviewRowResponse(
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
