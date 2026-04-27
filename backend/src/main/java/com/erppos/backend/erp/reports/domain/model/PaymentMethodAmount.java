package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;

public record PaymentMethodAmount(
        String paymentMethod,
        BigDecimal amount
) {
}

