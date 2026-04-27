package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;

public record QuotesReportResponse(
        long totalQuotes,
        long convertedQuotes,
        long cancelledQuotes,
        BigDecimal conversionRate,
        BigDecimal totalConvertedAmount
) {
}

