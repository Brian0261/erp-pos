package com.erppos.backend.erp.ecommerce.domain.model;

public record StorefrontPublicCategoryDetailProjection(
        String slug,
        String name,
        String description,
        long productCount,
        String seoTitle,
        String seoDescription,
        String canonicalPath,
        String robotsPolicy,
        Boolean seoIndexable,
        String ogTitle,
        String ogDescription,
        String ogImageUrl
) {
}
