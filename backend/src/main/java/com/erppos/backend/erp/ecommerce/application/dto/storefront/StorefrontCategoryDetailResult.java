package com.erppos.backend.erp.ecommerce.application.dto.storefront;

public record StorefrontCategoryDetailResult(
        String slug,
        String name,
        String description,
        long productCount,
        StorefrontSeoResult seo,
        String canonicalUrl,
        boolean indexable
) {
}
