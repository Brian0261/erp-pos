package com.erppos.backend.erp.inventory.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WarehouseUpdateRequest(
        @NotBlank(message = "code is required")
        @Size(max = 30, message = "code max length is 30")
        String code,
        @NotBlank(message = "name is required")
        @Size(max = 140, message = "name max length is 140")
        String name
) {
}
