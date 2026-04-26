package com.erppos.backend.erp.billing.domain.model;

import java.math.BigDecimal;

public record BillingSaleItemSnapshot(
        Long productId,
        String productName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal lineTotal
) {
}

