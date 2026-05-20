package com.erppos.backend.erp.catalog.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record UnitStatusRequest(
        @NotNull(message = "active is required")
        Boolean active
) {
}
