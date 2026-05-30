package com.erppos.backend.erp.ecommerce.domain.model;

import java.time.Instant;

public record EcommerceBrand(
        Long id,
        String name,
        String slug,
        String description,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
