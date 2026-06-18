package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportAction;

import java.util.List;

public record EcommercePrimaryImageBinaryImportConfirmRowResponse(
        int rowNumber,
        String sku,
        Long productId,
        Long profileId,
        EcommercePrimaryImageUrlImportAction action,
        boolean applied,
        String assetUrl,
        String storageKey,
        List<String> errors,
        List<String> warnings
) {
}
