package com.erppos.backend.erp.catalog.domain.model;
import java.math.BigDecimal;
import java.time.Instant;
public record Product(
        Long id,
        String sku,
        String barcode,
        String name,
        String description,
        Long categoryId,
        Long unitId,
        BigDecimal salePrice,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
