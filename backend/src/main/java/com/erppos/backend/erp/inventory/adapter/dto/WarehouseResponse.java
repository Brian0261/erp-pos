package com.erppos.backend.erp.inventory.adapter.dto;

import com.erppos.backend.erp.inventory.domain.model.WarehouseType;

import java.time.Instant;

public record WarehouseResponse(
        Long id,
        String code,
        String name,
        WarehouseType type,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}

