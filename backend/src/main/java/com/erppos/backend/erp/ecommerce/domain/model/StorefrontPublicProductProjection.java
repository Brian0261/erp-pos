package com.erppos.backend.erp.ecommerce.domain.model;

import java.math.BigDecimal;

public record StorefrontPublicProductProjection(
        String slug,
        String name,
        String shortDescription,
        BigDecimal effectivePriceAmount,
        String effectivePriceCurrency,
        String primaryImageUrl,
        String primaryImageAltText,
        String primaryImageType,
        Integer primaryImageDisplayOrder,
        String categorySlug,
        String categoryName,
        String brandSlug,
        String brandName
) {
}
