package com.erppos.backend.erp.ecommerce.application.dto.storefront;

import java.util.List;

public record StorefrontProductDetailResult(
        String slug,
        String name,
        String description,
        StorefrontImageResult primaryImage,
        List<StorefrontImageResult> gallery,
        StorefrontPriceResult price,
        StorefrontAvailabilityResult availability,
        StorefrontCategorySummaryResult category,
        StorefrontBrandSummaryResult brand,
        StorefrontSeoResult seo,
        String canonicalUrl,
        boolean indexable
) {
}
