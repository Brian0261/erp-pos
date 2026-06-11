package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceOnlineProfileImportAction;

import java.util.List;

public record EcommerceOnlineProfileImportPreviewRowResponse(
        int rowNumber,
        String sku,
        String productName,
        String publicationStatus,
        String onlineName,
        String slug,
        String onlineDescription,
        String onlineCategorySlug,
        String brandSlug,
        String brandAbsencePolicy,
        EcommerceOnlineProfileImportAction action,
        boolean valid,
        List<String> errors,
        List<String> generatedFields
) {
}
