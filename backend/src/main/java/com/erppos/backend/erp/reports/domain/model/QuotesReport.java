package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;

public record QuotesReport(
        long totalQuotes,
        long convertedQuotes,
        long cancelledQuotes,
        BigDecimal conversionRate,
        BigDecimal totalConvertedAmount
) {
}

