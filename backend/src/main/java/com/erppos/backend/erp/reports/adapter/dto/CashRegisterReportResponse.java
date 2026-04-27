package com.erppos.backend.erp.reports.adapter.dto;

import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CashRegisterReportResponse(
        BigDecimal openingAmount,
        BigDecimal countedAmount,
        BigDecimal expectedCashAmount,
        BigDecimal differenceAmount,
        BigDecimal totalSales,
        List<PaymentMethodAmountResponse> salesByPaymentMethod,
        Instant openedAt,
        Instant closedAt,
        CashRegisterStatus status
) {
}

