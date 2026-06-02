package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

import java.time.Instant;
import java.util.List;

public record PublicSitemapResponse(
        Instant generatedAt,
        List<PublicSitemapEntryResponse> entries,
        long totalEntries
) {
}
