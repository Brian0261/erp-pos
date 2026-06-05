package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;

public record EcommerceAdminOnlineProfileStatusResponse(
        Long productId,
        boolean hasOnlineProfile,
        OnlinePublicationStatus publicationStatus,
        String slug,
        String profileName
) {
}
