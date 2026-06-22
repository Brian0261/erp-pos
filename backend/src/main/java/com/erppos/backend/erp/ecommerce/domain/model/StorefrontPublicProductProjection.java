package com.erppos.backend.erp.ecommerce.domain.model;

import java.math.BigDecimal;
import java.util.List;

public record StorefrontPublicProductProjection(
        String slug,
        String name,
        String shortDescription,
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
        String brandName
) {
    public record ResponsiveImageVariantProjection(
            String url,
            String mimeType,
            Integer width,
            Integer height
    ) {
    }
}
