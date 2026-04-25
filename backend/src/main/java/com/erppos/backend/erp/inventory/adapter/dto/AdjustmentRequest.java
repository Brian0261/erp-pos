package com.erppos.backend.erp.inventory.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AdjustmentRequest(
        @NotNull(message = "productId is required")
        Long productId,
        @NotNull(message = "warehouseId is required")
        Long warehouseId,
        @NotNull(message = "quantity is required")
        @DecimalMin(value = "0.0001", inclusive = true, message = "quantity must be > 0")
        BigDecimal quantity,
        @NotNull(message = "type is required")
        AdjustmentType type,
        @NotBlank(message = "reason is required")
        String reason
) {
}

