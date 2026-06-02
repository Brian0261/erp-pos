package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

import java.time.Instant;

public record PublicSitemapEntryResponse(
        String loc,
        String type,
        Instant lastModified
) {
}
