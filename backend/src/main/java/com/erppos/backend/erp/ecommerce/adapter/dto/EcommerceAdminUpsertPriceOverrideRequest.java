package com.erppos.backend.erp.ecommerce.adapter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public record EcommerceAdminUpsertPriceOverrideRequest(
        @NotNull(message = "amount is required")
        @DecimalMin(value = "0.01", inclusive = true, message = "amount must be greater than zero")
        BigDecimal amount,
        @Size(max = 3, message = "currency max length is 3")
        String currency,
        @NotNull(message = "active is required")
        Boolean active,
        Instant validFrom,
        Instant validTo,
        @Size(max = 300, message = "reason max length is 300")
        String reason
) {
}
