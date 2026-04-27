package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalesByDay(
        LocalDate day,
        BigDecimal totalAmount,
        long salesCount
) {
}

