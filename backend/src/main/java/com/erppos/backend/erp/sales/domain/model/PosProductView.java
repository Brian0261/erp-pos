package com.erppos.backend.erp.sales.domain.model;

import com.erppos.backend.erp.shared.domain.policy.QuantityPolicy;
import java.math.BigDecimal;

public record PosProductView(
        Long productId,
        String sku,
        String barcode,
        String name,
        BigDecimal salePrice,
        QuantityPolicy quantityPolicy,
        BigDecimal stockAvailable
) {
}

