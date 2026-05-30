package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EcommerceAdminUpsertPrimaryAssetRequest(
        @NotNull(message = "assetType is required")
        AssetType assetType,
        @NotBlank(message = "assetUrl is required")
        @Size(max = 500, message = "assetUrl max length is 500")
        String assetUrl,
        @Size(max = 250, message = "altText max length is 250")
        String altText,
        @NotNull(message = "source is required")
        AssetSource source,
        @NotNull(message = "rightsConfirmed is required")
        Boolean rightsConfirmed,
        Integer displayOrder
) {
}
