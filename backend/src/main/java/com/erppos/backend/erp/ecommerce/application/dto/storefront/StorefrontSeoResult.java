package com.erppos.backend.erp.ecommerce.application.dto.storefront;

public record StorefrontSeoResult(
        String title,
        String description,
        String canonicalUrl,
        String robots,
        String ogTitle,
        String ogDescription,
        String ogImageUrl,
        boolean indexable
) {
}
