package com.erppos.backend.erp.sales.application.usecase;

import java.math.BigDecimal;

public record CloseCashRegisterCommand(
        BigDecimal countedAmount,
        String notes
) {
}

