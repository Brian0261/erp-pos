package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;

public record PaymentMethodAmountResponse(
        String paymentMethod,
        BigDecimal amount
) {
}

