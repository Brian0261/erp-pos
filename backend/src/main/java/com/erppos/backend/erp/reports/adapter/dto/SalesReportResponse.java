package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;
import java.util.List;

public record SalesReportResponse(
        BigDecimal totalSalesAmount,
        long totalSalesCount,
        BigDecimal averageTicket,
        long voidedSalesCount,
        List<PaymentMethodAmountResponse> salesByPaymentMethod,
        List<SalesByDayResponse> salesByDay
) {
}

