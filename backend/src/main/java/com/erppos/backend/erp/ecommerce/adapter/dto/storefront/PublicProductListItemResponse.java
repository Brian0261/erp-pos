package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

public record PublicProductListItemResponse(
        String slug,
        String name,
        String shortDescription,
        PublicImageResponse primaryImage,
        PublicPriceResponse price,
        PublicAvailabilityResponse availability,
        PublicCategorySummaryResponse category,
        PublicBrandSummaryResponse brand
) {
}
