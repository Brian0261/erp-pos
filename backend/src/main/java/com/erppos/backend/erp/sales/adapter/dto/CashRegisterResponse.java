package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CashRegisterResponse(
        Long id,
        UUID openedByUserId,
        Instant openedAt,
        Instant closedAt,
        BigDecimal openingAmount,
        BigDecimal countedAmount,
        BigDecimal expectedCashAmount,
        BigDecimal differenceAmount,
        CashRegisterStatus status,
        String notes
) {
}

