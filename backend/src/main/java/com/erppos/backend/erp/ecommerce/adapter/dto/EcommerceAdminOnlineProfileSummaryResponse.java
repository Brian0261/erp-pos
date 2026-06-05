package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.application.usecase.MissingRequirement;
import com.erppos.backend.erp.ecommerce.application.usecase.ReadinessStatus;
import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;

import java.time.Instant;
import java.util.List;

public record EcommerceAdminOnlineProfileSummaryResponse(
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
        Instant updatedAt,
        ReadinessStatus readinessStatus,
        int readinessCompleted,
        int readinessTotal,
        List<MissingRequirement> missingRequirements
) {
}
