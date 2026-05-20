package com.erppos.backend.erp.catalog.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record CategoryStatusRequest(
        @NotNull(message = "active is required")
        Boolean active
) {
}
