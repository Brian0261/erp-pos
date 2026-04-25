package com.erppos.backend.erp.security.domain;

import java.util.Set;
import java.util.UUID;

public record SecurityUser(
        UUID id,
        String username,
        String email,
        boolean active,
        Set<RoleName> roles
) {
}

