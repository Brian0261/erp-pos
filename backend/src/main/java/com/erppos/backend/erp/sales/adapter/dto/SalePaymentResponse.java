package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.sales.domain.model.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;

public record SalePaymentResponse(
        Long id,
        PaymentMethod paymentMethod,
        BigDecimal amount,
        String reference,
        Instant createdAt
) {
}

