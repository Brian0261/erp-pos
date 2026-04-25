package com.erppos.backend.erp.catalog.domain.model;
import java.time.Instant;
public record Category(
        Long id,
        String name,
        String description,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
