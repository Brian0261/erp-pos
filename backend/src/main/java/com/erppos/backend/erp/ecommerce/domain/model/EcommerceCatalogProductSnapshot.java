package com.erppos.backend.erp.ecommerce.domain.model;

import java.math.BigDecimal;

public record EcommerceCatalogProductSnapshot(
        Long id,
        String sku,
        String name,
        BigDecimal salePrice,
        boolean active
) {
}
