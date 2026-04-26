package com.erppos.backend.erp.quotes.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record QuoteItemRequest(
        @NotNull(message = "productId is required")
        Long productId,
        @NotNull(message = "quantity is required")
        @DecimalMin(value = "0.0001", inclusive = true, message = "quantity must be > 0")
        BigDecimal quantity,
        @DecimalMin(value = "0.0", inclusive = true, message = "discountAmount must be >= 0")
        BigDecimal discountAmount
) {
}

