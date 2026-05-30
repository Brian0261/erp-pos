package com.erppos.backend.erp.ecommerce.domain.model;

import java.time.Instant;

public record ProductAsset(
        Long id,
        Long productOnlineProfileId,
        AssetType assetType,
        String assetUrl,
        String altText,
        AssetSource source,
        boolean rightsConfirmed,
        boolean primary,
        boolean active,
        int displayOrder,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
