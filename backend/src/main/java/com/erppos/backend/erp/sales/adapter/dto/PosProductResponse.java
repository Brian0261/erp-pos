package com.erppos.backend.erp.sales.adapter.dto;

import java.math.BigDecimal;

public record PosProductResponse(
        Long productId,
        String sku,
        String barcode,
        String name,
        BigDecimal salePrice,
        BigDecimal stockAvailable
) {
}

