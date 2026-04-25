package com.erppos.backend.erp.inventory.adapter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record TransferRequest(
        @NotNull(message = "sourceWarehouseId is required")
        Long sourceWarehouseId,
        @NotNull(message = "targetWarehouseId is required")
        Long targetWarehouseId,
        @NotBlank(message = "reason is required")
        String reason,
        @NotEmpty(message = "items are required")
        List<@Valid TransferItemRequest> items
) {
}

