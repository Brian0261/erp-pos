package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;

public record UpsertProductAssetCommand(
        Long productId,
        AssetType assetType,
        String assetUrl,
        String altText,
        AssetSource source,
        boolean rightsConfirmed,
        int displayOrder
) {
}
