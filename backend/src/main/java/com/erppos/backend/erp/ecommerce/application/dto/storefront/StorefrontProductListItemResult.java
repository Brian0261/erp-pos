package com.erppos.backend.erp.ecommerce.application.dto.storefront;

public record StorefrontProductListItemResult(
        String slug,
        String name,
        String shortDescription,
        StorefrontImageResult primaryImage,
        StorefrontPriceResult price,
        StorefrontAvailabilityResult availability,
        StorefrontCategorySummaryResult category,
        StorefrontBrandSummaryResult brand
) {
}
