package com.erppos.backend.erp.inventory.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record InitialStockRequest(
        @NotNull(message = "productId is required")
        Long productId,
        @NotNull(message = "warehouseId is required")
        Long warehouseId,
        @NotNull(message = "quantity is required")
        @DecimalMin(value = "1", inclusive = true, message = "must be >= 1")
        @Digits(integer = 18, fraction = 0, message = "must not have decimals")
        BigDecimal quantity,
        @NotBlank(message = "reason is required")
        String reason
) {
}

