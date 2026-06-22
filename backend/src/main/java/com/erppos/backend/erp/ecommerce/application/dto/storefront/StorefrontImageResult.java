package com.erppos.backend.erp.ecommerce.application.dto.storefront;

import java.util.List;

public record StorefrontImageResult(
        String url,
        String altText,
        String type,
        Integer displayOrder,
        StorefrontResponsiveImageResult responsive
) {
    public record StorefrontResponsiveImageResult(
            List<StorefrontResponsiveImageVariantResult> variants
    ) {
    }

    public record StorefrontResponsiveImageVariantResult(
            String url,
            String mimeType,
            Integer width,
            Integer height
    ) {
    }
}
