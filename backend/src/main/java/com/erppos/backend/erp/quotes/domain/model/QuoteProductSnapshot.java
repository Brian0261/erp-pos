package com.erppos.backend.erp.quotes.domain.model;

import java.math.BigDecimal;

public record QuoteProductSnapshot(
        Long id,
        String sku,
        String barcode,
        String name,
        BigDecimal salePrice,
        boolean active
) {
}

