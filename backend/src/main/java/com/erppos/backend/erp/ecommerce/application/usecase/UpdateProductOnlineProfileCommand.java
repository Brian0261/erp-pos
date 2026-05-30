package com.erppos.backend.erp.ecommerce.application.usecase;

import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;

public record UpdateProductOnlineProfileCommand(
        Long productId,
        String slug,
        String onlineName,
        String onlineDescription,
        Long onlineCategoryId,
        Long brandId,
        BrandAbsencePolicy brandAbsencePolicy
) {
}
