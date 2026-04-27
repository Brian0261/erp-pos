package com.erppos.backend.erp.reports.domain.model;

import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CashRegisterReport(
        BigDecimal openingAmount,
        BigDecimal countedAmount,
        BigDecimal expectedCashAmount,
        BigDecimal differenceAmount,
        BigDecimal totalSales,
        List<PaymentMethodAmount> salesByPaymentMethod,
        Instant openedAt,
        Instant closedAt,
        CashRegisterStatus status
) {
}

