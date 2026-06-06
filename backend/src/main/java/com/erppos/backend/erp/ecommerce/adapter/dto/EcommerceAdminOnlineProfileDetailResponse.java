package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;

import java.time.Instant;

public record EcommerceAdminOnlineProfileDetailResponse(
        Long profileId,
        Long productId,
        String productSku,
        String productName,
        boolean productActive,
        OnlinePublicationStatus publicationStatus,
        String slug,
        String onlineName,
        String onlineDescription,
        Long onlineCategoryId,
        Long brandId,
        BrandAbsencePolicy brandAbsencePolicy,
        Instant publishedAt,
        Instant unpublishedAt,
        Instant createdAt,
        Instant updatedAt,
        EcommerceAdminSeoMetadataResponse seo,
        EcommerceAdminPrimaryAssetResponse primaryAsset,
        EcommerceAdminPriceOverrideResponse activePriceOverride,
        EcommerceAdminEffectivePriceResponse effectivePrice,
        EcommerceAdminPublicationValidationResponse publicationValidation
) {
}
