package com.erppos.backend.erp.ecommerce.application.dto;

import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;

import java.time.Instant;

public record OnlineProfileSummaryResult(
        Long profileId,
        Long productId,
        OnlinePublicationStatus publicationStatus,
        String slug,
        String onlineName,
        Long onlineCategoryId,
        String onlineCategoryName,
        Long brandId,
        String brandName,
        BrandAbsencePolicy brandAbsencePolicy,
        Instant publishedAt,
        Instant updatedAt
) {
}
