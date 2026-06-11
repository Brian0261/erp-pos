package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceOnlineProfileImportAction;

import java.util.List;

public record EcommerceOnlineProfileImportConfirmRowResponse(
        int rowNumber,
        String sku,
        EcommerceOnlineProfileImportAction action,
        boolean applied,
        Long profileId,
        List<String> errors
) {
}
