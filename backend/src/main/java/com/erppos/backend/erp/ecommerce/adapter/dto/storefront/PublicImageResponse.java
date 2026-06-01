package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

public record PublicImageResponse(
        String url,
        String altText,
        String type,
        Integer displayOrder
) {
}
