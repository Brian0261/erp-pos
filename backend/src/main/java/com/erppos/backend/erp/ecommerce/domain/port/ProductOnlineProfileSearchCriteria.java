package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.application.usecase.ReadinessStatus;

public record ProductOnlineProfileSearchCriteria(
        OnlinePublicationStatus status,
        ReadinessStatus readinessStatus,
        Long brandId,
        boolean withoutBrand,
        Long onlineCategoryId,
        boolean withoutOnlineCategory,
        String query
) {
}
