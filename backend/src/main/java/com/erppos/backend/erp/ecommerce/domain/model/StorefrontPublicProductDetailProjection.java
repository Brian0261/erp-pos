package com.erppos.backend.erp.ecommerce.domain.model;

import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductProjection.ResponsiveImageVariantProjection;

import java.math.BigDecimal;
import java.util.List;

public record StorefrontPublicProductDetailProjection(
        String slug,
        String name,
        String description,
        BigDecimal effectivePriceAmount,
        String effectivePriceCurrency,
        Long primaryImageAssetId,
        String primaryImageUrl,
        String primaryImageAltText,
        String primaryImageType,
        Integer primaryImageDisplayOrder,
        List<ResponsiveImageVariantProjection> primaryImageResponsiveVariants,
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
