package com.erppos.backend.erp.sales.adapter.dto;

import java.math.BigDecimal;

public record SaleItemResponse(
        Long id,
        Long productId,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal lineTotal
) {
}

