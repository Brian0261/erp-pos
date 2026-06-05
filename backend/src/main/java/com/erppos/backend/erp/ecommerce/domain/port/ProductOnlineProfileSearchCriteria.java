package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;

public record ProductOnlineProfileSearchCriteria(
        OnlinePublicationStatus status,
        Long brandId,
        boolean withoutBrand,
        Long onlineCategoryId,
        boolean withoutOnlineCategory,
        String query
) {
}
