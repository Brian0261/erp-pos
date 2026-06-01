package com.erppos.backend.erp.ecommerce.domain.model;

import java.math.BigDecimal;

public record StorefrontPublicProductDetailProjection(
        String slug,
        String name,
        String description,
        BigDecimal effectivePriceAmount,
        String effectivePriceCurrency,
        String primaryImageUrl,
        String primaryImageAltText,
        String primaryImageType,
        Integer primaryImageDisplayOrder,
        String categorySlug,
        String categoryName,
        String brandSlug,
        String brandName,
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
