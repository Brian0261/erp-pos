package com.erppos.backend.erp.security.application;

import com.erppos.backend.erp.security.domain.SecurityUser;

import java.time.Instant;

public record AuthResult(
        String accessToken,
        Instant expiresAt,
        SecurityUser user
) {
}

