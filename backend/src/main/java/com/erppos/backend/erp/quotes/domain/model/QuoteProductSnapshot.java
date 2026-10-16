package com.erppos.backend.erp.quotes.domain.model;

import com.erppos.backend.erp.shared.domain.policy.QuantityPolicy;
import java.math.BigDecimal;

public record QuoteProductSnapshot(
        Long id,
        String sku,
        String barcode,
        String name,
        BigDecimal salePrice,
        QuantityPolicy quantityPolicy,
        boolean active
) {
}

