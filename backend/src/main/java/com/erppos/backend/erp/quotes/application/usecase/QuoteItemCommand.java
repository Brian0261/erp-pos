package com.erppos.backend.erp.quotes.application.usecase;

import java.math.BigDecimal;

public record QuoteItemCommand(
        Long productId,
        BigDecimal quantity,
        BigDecimal discountAmount
) {
}

