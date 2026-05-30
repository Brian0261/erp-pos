package com.erppos.backend.erp.ecommerce.application.usecase;

import java.math.BigDecimal;

public record EffectiveOnlinePriceResult(
        BigDecimal amount,
        String currency,
        boolean overrideApplied
) {
}
