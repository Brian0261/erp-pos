package com.erppos.backend.erp.catalog.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryUpdateRequest(
        @NotBlank(message = "name is required")
        @Size(max = 120, message = "name max length is 120")
        String name,
        @Size(max = 400, message = "description max length is 400")
        String description
) {
}
