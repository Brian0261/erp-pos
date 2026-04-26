package com.erppos.backend.erp.quotes.adapter.dto;

import com.erppos.backend.erp.sales.domain.model.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record QuotePaymentRequest(
        @NotNull(message = "paymentMethod is required")
        PaymentMethod paymentMethod,
        @NotNull(message = "amount is required")
        @DecimalMin(value = "0.0001", inclusive = true, message = "amount must be > 0")
        BigDecimal amount,
        @Size(max = 120, message = "reference max length is 120")
        String reference
) {
}

