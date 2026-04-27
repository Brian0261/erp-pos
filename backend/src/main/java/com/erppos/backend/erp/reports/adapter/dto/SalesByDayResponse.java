package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalesByDayResponse(
        LocalDate day,
        BigDecimal totalAmount,
        long salesCount
) {
}

