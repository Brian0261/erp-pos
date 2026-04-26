package com.erppos.backend.erp.sales.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

public record SalePayment(
        Long id,
        Long saleId,
        PaymentMethod paymentMethod,
        BigDecimal amount,
        String reference,
        Instant createdAt
) {
}

