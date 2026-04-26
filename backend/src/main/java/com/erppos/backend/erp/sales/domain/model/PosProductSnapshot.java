package com.erppos.backend.erp.sales.domain.model;

import java.math.BigDecimal;

public record PosProductSnapshot(
        Long id,
        String sku,
        String barcode,
        String name,
        BigDecimal salePrice,
        boolean active
) {
}

