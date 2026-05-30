package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import jakarta.validation.constraints.Size;

public record EcommerceAdminUpdateOnlineProfileRequest(
        @Size(max = 180, message = "slug max length is 180")
        String slug,
        @Size(max = 180, message = "onlineName max length is 180")
        String onlineName,
        @Size(max = 2000, message = "onlineDescription max length is 2000")
        String onlineDescription,
        Long onlineCategoryId,
        Long brandId,
        BrandAbsencePolicy brandAbsencePolicy
) {
}
