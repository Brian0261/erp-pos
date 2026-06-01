package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

public record PublicCategoryDetailResponse(
        String slug,
        String name,
        String description,
        long productCount,
        PublicSeoResponse seo,
        String canonicalUrl,
        boolean indexable
) {
}
