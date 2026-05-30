package com.erppos.backend.erp.ecommerce.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record EcommerceAdminBrandStatusRequest(
        @NotNull(message = "active is required")
        Boolean active
) {
}
