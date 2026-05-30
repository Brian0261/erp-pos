package com.erppos.backend.erp.ecommerce.adapter.dto;

import java.math.BigDecimal;

public record EcommerceAdminEffectivePriceResponse(
        BigDecimal amount,
        String currency,
        boolean overrideApplied
) {
}
