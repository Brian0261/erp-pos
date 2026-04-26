package com.erppos.backend.erp.sales.application.usecase;

import java.math.BigDecimal;

public record OpenCashRegisterCommand(
        BigDecimal openingAmount,
        String notes
) {
}

