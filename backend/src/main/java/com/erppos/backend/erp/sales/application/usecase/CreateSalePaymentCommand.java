package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.sales.domain.model.PaymentMethod;

import java.math.BigDecimal;

public record CreateSalePaymentCommand(
        PaymentMethod paymentMethod,
        BigDecimal amount,
        String reference
) {
}

