package com.erppos.backend.erp.ecommerce.adapter.dto;

import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
import jakarta.validation.constraints.Size;

public record EcommerceAdminUpsertSeoRequest(
        @Size(max = 160, message = "seoTitle max length is 160")
        String seoTitle,
        @Size(max = 320, message = "seoDescription max length is 320")
        String seoDescription,
        @Size(max = 300, message = "canonicalPath max length is 300")
        String canonicalPath,
        RobotsPolicy robotsPolicy,
        Boolean indexable,
        @Size(max = 160, message = "ogTitle max length is 160")
        String ogTitle,
        @Size(max = 320, message = "ogDescription max length is 320")
        String ogDescription,
        @Size(max = 500, message = "ogImageUrl max length is 500")
        String ogImageUrl
) {
}
