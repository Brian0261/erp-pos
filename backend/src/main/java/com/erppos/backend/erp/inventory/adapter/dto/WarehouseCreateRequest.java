package com.erppos.backend.erp.inventory.adapter.dto;

import com.erppos.backend.erp.inventory.domain.model.WarehouseType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record WarehouseCreateRequest(
        @NotBlank(message = "code is required")
        @Size(max = 30, message = "code max length is 30")
        String code,
        @NotBlank(message = "name is required")
        @Size(max = 140, message = "name max length is 140")
        String name,
        @NotNull(message = "type is required")
        WarehouseType type
) {
}

