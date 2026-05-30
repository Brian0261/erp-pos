package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;

import java.time.Instant;

public record EcommerceAdminOnlineProfileSummaryResponse(
        Long profileId,
        Long productId,
        OnlinePublicationStatus publicationStatus,
        String slug,
        String onlineName,
        Long onlineCategoryId,
        Long brandId,
        BrandAbsencePolicy brandAbsencePolicy,
        Instant publishedAt,
        Instant updatedAt
) {
}
