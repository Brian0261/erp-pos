package com.erppos.backend.erp.security.adapter.rest;

import java.time.Instant;

public record LoginResponse(
        String tokenType,
        String accessToken,
        Instant expiresAt,
        UserMeResponse user
) {
}

