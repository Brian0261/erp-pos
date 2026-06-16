package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportAction;

import java.util.List;

public record EcommercePrimaryImageUrlImportPreviewRowResponse(
        int rowNumber,
        String sku,
        Long productId,
        Long profileId,
        String productName,
        String publicationStatus,
        String currentAssetUrl,
        String imageUrl,
        String altText,
        String source,
        Boolean rightsConfirmed,
        String assetType,
        Integer displayOrder,
        EcommercePrimaryImageUrlImportAction action,
        boolean valid,
        List<String> errors,
        List<String> warnings
) {
}
