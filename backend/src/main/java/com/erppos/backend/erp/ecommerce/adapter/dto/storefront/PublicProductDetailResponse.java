package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

import java.util.List;

public record PublicProductDetailResponse(
        String slug,
        String name,
        String description,
        PublicImageResponse primaryImage,
        List<PublicImageResponse> gallery,
        PublicPriceResponse price,
        PublicAvailabilityResponse availability,
        PublicCategorySummaryResponse category,
        PublicBrandSummaryResponse brand,
        PublicSeoResponse seo,
        String canonicalUrl,
        boolean indexable
) {
}
