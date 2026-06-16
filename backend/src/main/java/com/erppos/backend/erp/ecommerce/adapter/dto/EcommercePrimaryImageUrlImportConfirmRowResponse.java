package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageUrlImportAction;

import java.util.List;

public record EcommercePrimaryImageUrlImportConfirmRowResponse(
        int rowNumber,
        String sku,
        Long productId,
        Long profileId,
        EcommercePrimaryImageUrlImportAction action,
        boolean applied,
        List<String> errors,
        List<String> warnings
) {
}
