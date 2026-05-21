package com.erppos.backend.erp.inventory.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record WarehouseStatusRequest(
        @NotNull(message = "active is required")
        Boolean active
) {
}
