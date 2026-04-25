package com.erppos.backend.erp.catalog.adapter.dto;
import java.time.Instant;
public record UnitResponse(
        Long id,
        String code,
        String name,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
