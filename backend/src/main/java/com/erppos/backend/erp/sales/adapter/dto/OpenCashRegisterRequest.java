package com.erppos.backend.erp.sales.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record OpenCashRegisterRequest(
        @NotNull(message = "openingAmount is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "openingAmount must be >= 0")
        BigDecimal openingAmount,
        @Size(max = 400, message = "notes max length is 400")
        String notes
) {
}

