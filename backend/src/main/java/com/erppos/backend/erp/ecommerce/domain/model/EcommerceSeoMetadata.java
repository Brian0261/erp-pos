package com.erppos.backend.erp.ecommerce.domain.model;

import java.time.Instant;

public record EcommerceSeoMetadata(
        Long id,
        Long productOnlineProfileId,
        Long onlineCategoryId,
        Long brandId,
        String seoTitle,
        String seoDescription,
        String canonicalPath,
        RobotsPolicy robotsPolicy,
        boolean indexable,
        String ogTitle,
        String ogDescription,
        String ogImageUrl,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
