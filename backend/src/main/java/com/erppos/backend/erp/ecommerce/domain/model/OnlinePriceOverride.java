package com.erppos.backend.erp.ecommerce.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

public record OnlinePriceOverride(
        Long id,
        Long productOnlineProfileId,
        BigDecimal amount,
        String currency,
        boolean active,
        Instant validFrom,
        Instant validTo,
        String reason,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
