package com.erppos.backend.erp.quotes.application.usecase;

import com.erppos.backend.erp.sales.domain.model.PaymentMethod;

import java.math.BigDecimal;

public record QuotePaymentCommand(
        PaymentMethod paymentMethod,
        BigDecimal amount,
        String reference
) {
}

