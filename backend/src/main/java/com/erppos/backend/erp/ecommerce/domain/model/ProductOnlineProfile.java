package com.erppos.backend.erp.ecommerce.domain.model;

import java.time.Instant;

public record ProductOnlineProfile(
        Long id,
        Long productId,
        OnlinePublicationStatus publicationStatus,
        String slug,
        String onlineName,
        String onlineDescription,
        Long onlineCategoryId,
        Long brandId,
        BrandAbsencePolicy brandAbsencePolicy,
        Instant publishedAt,
        Instant unpublishedAt,
        Long version,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
