package com.erppos.backend.erp.ecommerce.application.dto.storefront;

import java.math.BigDecimal;

public record StorefrontPriceResult(
        BigDecimal amount,
        String currency,
        String formatted
) {
}
