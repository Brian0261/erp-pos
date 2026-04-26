package com.erppos.backend.erp.sales.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CashRegisterSession(
        Long id,
        UUID openedByUserId,
        Instant openedAt,
        Instant closedAt,
        BigDecimal openingAmount,
        BigDecimal countedAmount,
        BigDecimal expectedCashAmount,
        BigDecimal differenceAmount,
        CashRegisterStatus status,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {
}

