package com.erppos.backend.erp.catalog.domain.model;
import java.time.Instant;
public record Unit(
        Long id,
        String code,
        String name,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
