package com.erppos.backend.erp.ecommerce.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EcommerceAdminBrandRequest(
        @NotBlank(message = "name is required")
        @Size(max = 140, message = "name max length is 140")
        String name,
        @Size(max = 180, message = "slug max length is 180")
        String slug,
        @Size(max = 800, message = "description max length is 800")
        String description
) {
}
