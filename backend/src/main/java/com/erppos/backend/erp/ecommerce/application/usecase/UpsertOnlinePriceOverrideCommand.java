package com.erppos.backend.erp.ecommerce.application.usecase;

import java.math.BigDecimal;
import java.time.Instant;

public record UpsertOnlinePriceOverrideCommand(
        Long productId,
        BigDecimal amount,
        String currency,
        boolean active,
        Instant validFrom,
        Instant validTo,
        String reason
) {
}
