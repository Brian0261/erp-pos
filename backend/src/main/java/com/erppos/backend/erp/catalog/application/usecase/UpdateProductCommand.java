package com.erppos.backend.erp.catalog.application.usecase;
import java.math.BigDecimal;
public record UpdateProductCommand(
        String sku,
        String barcode,
        String name,
        String description,
        Long categoryId,
        Long unitId,
        BigDecimal salePrice,
        Boolean active
) {
}
