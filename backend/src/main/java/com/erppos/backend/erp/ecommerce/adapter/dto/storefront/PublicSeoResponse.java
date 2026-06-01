package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

public record PublicSeoResponse(
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
