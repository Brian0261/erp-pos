package com.erppos.backend.erp.ecommerce.adapter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EcommerceAdminOnlineCategoryRequest(
        Long parentId,
        @NotBlank(message = "name is required")
        @Size(max = 140, message = "name max length is 140")
        String name,
        @Size(max = 180, message = "slug max length is 180")
        String slug,
        @Size(max = 1000, message = "description max length is 1000")
        String description
) {
}
