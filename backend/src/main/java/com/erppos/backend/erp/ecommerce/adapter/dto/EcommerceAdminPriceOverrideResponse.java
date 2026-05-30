package com.erppos.backend.erp.ecommerce.adapter.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record EcommerceAdminPriceOverrideResponse(
        Long id,
        BigDecimal amount,
        String currency,
        boolean active,
        Instant validFrom,
        Instant validTo,
        String reason,
        Instant updatedAt
) {
}
