package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;
import java.util.List;

public record SalesReport(
        BigDecimal totalSalesAmount,
        long totalSalesCount,
        BigDecimal averageTicket,
        long voidedSalesCount,
        List<PaymentMethodAmount> salesByPaymentMethod,
        List<SalesByDay> salesByDay
) {
}

