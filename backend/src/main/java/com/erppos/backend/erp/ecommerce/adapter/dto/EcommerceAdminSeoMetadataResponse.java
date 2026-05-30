package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;

import java.time.Instant;

public record EcommerceAdminSeoMetadataResponse(
        Long id,
        String seoTitle,
        String seoDescription,
        String canonicalPath,
        RobotsPolicy robotsPolicy,
        boolean indexable,
        String ogTitle,
        String ogDescription,
        String ogImageUrl,
        Instant updatedAt
) {
}
