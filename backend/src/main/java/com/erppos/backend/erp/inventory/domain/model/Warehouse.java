package com.erppos.backend.erp.inventory.domain.model;

import java.time.Instant;

public record Warehouse(
        Long id,
        String code,
        String name,
        WarehouseType type,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}

