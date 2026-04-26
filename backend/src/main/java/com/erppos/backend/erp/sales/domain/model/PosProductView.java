package com.erppos.backend.erp.sales.domain.model;

import java.math.BigDecimal;

public record PosProductView(
        Long productId,
        String sku,
        String barcode,
        String name,
        BigDecimal salePrice,
        BigDecimal stockAvailable
) {
}

