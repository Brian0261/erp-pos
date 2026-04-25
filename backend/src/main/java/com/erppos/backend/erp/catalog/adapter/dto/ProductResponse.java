package com.erppos.backend.erp.catalog.adapter.dto;
import java.math.BigDecimal;
import java.time.Instant;
public record ProductResponse(
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
        Instant updatedAt
) {
}
