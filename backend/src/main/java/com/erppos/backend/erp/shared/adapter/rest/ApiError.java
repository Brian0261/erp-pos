package com.erppos.backend.erp.shared.adapter.rest;

import java.time.Instant;

public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        String traceId
) {
}

