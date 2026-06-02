package com.erppos.backend.erp.ecommerce.application.dto.storefront;

import java.time.Instant;

public record StorefrontSitemapEntryResult(
        String loc,
        String type,
        Instant lastModified
) {
}
