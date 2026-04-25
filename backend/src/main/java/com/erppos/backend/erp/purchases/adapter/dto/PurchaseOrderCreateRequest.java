package com.erppos.backend.erp.purchases.adapter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record PurchaseOrderCreateRequest(
        @NotNull(message = "supplierId is required")
        Long supplierId,
        @NotNull(message = "warehouseId is required")
        Long warehouseId,
        LocalDate orderDate,
        LocalDate expectedDate,
        @Size(max = 400, message = "notes max length is 400")
        String notes,
        @NotEmpty(message = "items are required")
        List<@Valid PurchaseOrderItemRequest> items
) {
}

