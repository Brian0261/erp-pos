package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportAction;

import java.util.List;

public record EcommercePrimaryImageBinaryImportPreviewRowResponse(
        int rowNumber,
        String sku,
        Long productId,
        Long profileId,
        String productName,
        String publicationStatus,
        String currentAssetUrl,
        String imageFile,
        String altText,
        String source,
        Boolean rightsConfirmed,
        String assetType,
        Integer displayOrder,
        String mimeType,
        Integer width,
        Integer height,
        Long sizeBytes,
        String checksumSha256,
        EcommercePrimaryImageUrlImportAction action,
        boolean valid,
        List<String> errors,
        List<String> warnings
) {
}
