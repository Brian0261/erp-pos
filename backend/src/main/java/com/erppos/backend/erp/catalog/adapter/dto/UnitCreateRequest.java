package com.erppos.backend.erp.catalog.adapter.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record UnitCreateRequest(
        @NotBlank(message = "code is required")
        @Size(max = 20, message = "code max length is 20")
        String code,
        @NotBlank(message = "name is required")
        @Size(max = 120, message = "name max length is 120")
        String name
) {
}
