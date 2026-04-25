package com.erppos.backend.erp.security.adapter.rest;

import java.util.Set;
import java.util.UUID;

public record UserMeResponse(
        UUID id,
        String username,
        String email,
        Set<String> roles
) {
}

