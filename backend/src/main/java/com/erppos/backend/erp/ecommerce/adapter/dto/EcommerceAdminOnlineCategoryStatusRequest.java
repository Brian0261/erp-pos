package com.erppos.backend.erp.ecommerce.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record EcommerceAdminOnlineCategoryStatusRequest(
        @NotNull(message = "active is required")
        Boolean active
) {
}
