package com.erppos.backend.erp.quotes.adapter.dto;

import java.math.BigDecimal;

public record QuoteItemResponse(
        Long id,
        Long productId,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal lineTotal
) {
}

