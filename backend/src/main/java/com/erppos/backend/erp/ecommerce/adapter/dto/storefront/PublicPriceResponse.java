package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

import java.math.BigDecimal;

public record PublicPriceResponse(
        BigDecimal amount,
        String currency,
        String formatted
) {
}
