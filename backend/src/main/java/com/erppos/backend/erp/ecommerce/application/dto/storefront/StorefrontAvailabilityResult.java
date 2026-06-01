package com.erppos.backend.erp.ecommerce.application.dto.storefront;

public record StorefrontAvailabilityResult(
        String status,
        String label,
        boolean purchasable
) {
}
