package com.erppos.backend.erp.purchases.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ReceivePurchaseItemRequest(
        @NotNull(message = "purchaseOrderItemId is required")
        Long purchaseOrderItemId,
        @NotNull(message = "quantityReceived is required")
        @DecimalMin(value = "0.0001", inclusive = true, message = "quantityReceived must be > 0")
        BigDecimal quantityReceived
) {
}

