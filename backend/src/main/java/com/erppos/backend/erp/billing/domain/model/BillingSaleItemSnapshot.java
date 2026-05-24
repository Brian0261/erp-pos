package com.erppos.backend.erp.billing.domain.model;

import java.math.BigDecimal;

public record BillingSaleItemSnapshot(
        Long productId,
        String productName,
        String sku,
        String barcode,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal lineTotal
) {
}

