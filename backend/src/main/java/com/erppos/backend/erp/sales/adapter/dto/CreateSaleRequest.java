package com.erppos.backend.erp.sales.adapter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateSaleRequest(
        @NotNull(message = "warehouseId is required")
        Long warehouseId,
        @NotEmpty(message = "items are required")
        List<@Valid CreateSaleItemRequest> items,
        @NotEmpty(message = "payments are required")
        List<@Valid CreateSalePaymentRequest> payments
) {
}

