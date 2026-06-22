package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

import java.util.List;

public record PublicImageResponse(
        String url,
        String altText,
        String type,
        Integer displayOrder,
        PublicResponsiveImageResponse responsive
) {
    public record PublicResponsiveImageResponse(
            List<PublicResponsiveImageVariantResponse> variants
    ) {
    }

    public record PublicResponsiveImageVariantResponse(
            String url,
            String mimeType,
            Integer width,
            Integer height
    ) {
    }
}
