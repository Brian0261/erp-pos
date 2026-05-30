package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;

public record UpsertProductSeoMetadataCommand(
        Long productId,
        String seoTitle,
        String seoDescription,
        String canonicalPath,
        RobotsPolicy robotsPolicy,
        boolean indexable,
        String ogTitle,
        String ogDescription,
        String ogImageUrl
) {
}
