package com.erppos.backend.erp.catalog.adapter.dto;
import java.time.Instant;
public record CategoryResponse(
        Long id,
        String name,
        String description,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
