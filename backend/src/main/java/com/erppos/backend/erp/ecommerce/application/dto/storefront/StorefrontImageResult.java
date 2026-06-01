package com.erppos.backend.erp.ecommerce.application.dto.storefront;

public record StorefrontImageResult(
        String url,
        String altText,
        String type,
        Integer displayOrder
) {
}
