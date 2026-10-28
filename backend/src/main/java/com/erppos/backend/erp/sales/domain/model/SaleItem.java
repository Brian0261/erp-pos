package com.erppos.backend.erp.sales.domain.model;

import java.math.BigDecimal;

public record SaleItem(
        Long id,
        Long saleId,
        Long productId,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal lineTotal,
        String productNameSnapshot,
        String skuSnapshot
) {
    /** Compatibility for historical items and callers without captured product identity. */
    public SaleItem(Long id, Long saleId, Long productId, BigDecimal quantity, BigDecimal unitPrice,
                    BigDecimal discountAmount, BigDecimal lineTotal) {
        this(id, saleId, productId, quantity, unitPrice, discountAmount, lineTotal, null, null);
    }
}

