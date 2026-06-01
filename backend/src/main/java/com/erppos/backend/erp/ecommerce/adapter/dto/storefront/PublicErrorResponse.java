package com.erppos.backend.erp.ecommerce.adapter.dto.storefront;

import java.time.Instant;

public record PublicErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        String traceId
) {
}
