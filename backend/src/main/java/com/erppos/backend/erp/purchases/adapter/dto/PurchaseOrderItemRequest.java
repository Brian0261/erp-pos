package com.erppos.backend.erp.purchases.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PurchaseOrderItemRequest(
        @NotNull(message = "productId is required")
        Long productId,
        @NotNull(message = "quantityOrdered is required")
        @DecimalMin(value = "0.0001", inclusive = true, message = "quantityOrdered must be > 0")
        BigDecimal quantityOrdered,
        @NotNull(message = "unitCost is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "unitCost must be >= 0")
        BigDecimal unitCost
) {
}

