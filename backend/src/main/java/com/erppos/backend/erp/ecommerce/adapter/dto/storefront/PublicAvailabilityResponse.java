package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

public record PublicAvailabilityResponse(
        String status,
        String label,
        boolean purchasable
) {
}
