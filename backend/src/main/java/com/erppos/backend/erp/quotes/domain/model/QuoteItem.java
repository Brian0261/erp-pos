package com.erppos.backend.erp.quotes.domain.model;

import java.math.BigDecimal;

public record QuoteItem(
        Long id,
        Long quoteId,
        Long productId,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal lineTotal
) {
}

