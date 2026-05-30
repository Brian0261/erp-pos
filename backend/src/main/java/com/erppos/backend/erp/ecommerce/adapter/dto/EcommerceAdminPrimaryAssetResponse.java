package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;

import java.time.Instant;

public record EcommerceAdminPrimaryAssetResponse(
        Long id,
        AssetType assetType,
        String assetUrl,
        String altText,
        AssetSource source,
        boolean rightsConfirmed,
        int displayOrder,
        boolean active,
        Instant updatedAt
) {
}
