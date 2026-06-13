package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;

public record UploadPrimaryProductAssetCommand(
        Long productId,
        byte[] fileBytes,
        String originalFilename,
        String contentType,
        String altText,
        AssetSource source,
        boolean rightsConfirmed,
        int displayOrder
) {
}
