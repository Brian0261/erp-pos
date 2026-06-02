package com.erppos.backend.erp.ecommerce.application.dto.storefront;

import java.time.Instant;
import java.util.List;

public record StorefrontSitemapResult(
        Instant generatedAt,
        List<StorefrontSitemapEntryResult> entries,
        long totalEntries
) {
}
