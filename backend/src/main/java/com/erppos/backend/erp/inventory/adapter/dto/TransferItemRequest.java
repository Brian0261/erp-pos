package com.erppos.backend.erp.inventory.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TransferItemRequest(
        @NotNull(message = "productId is required")
        Long productId,
        @NotNull(message = "quantity is required")
        @DecimalMin(value = "0.0001", inclusive = true, message = "quantity must be > 0")
        BigDecimal quantity
) {
}

