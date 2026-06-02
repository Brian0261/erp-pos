package com.erppos.backend.erp.ecommerce.domain.model;

import java.time.Instant;

public record StorefrontSitemapEntryProjection(
        String loc,
        String type,
        Instant lastModified
) {
}
