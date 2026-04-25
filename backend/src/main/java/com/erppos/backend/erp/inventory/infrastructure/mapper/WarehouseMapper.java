package com.erppos.backend.erp.inventory.infrastructure.mapper;

import com.erppos.backend.erp.inventory.domain.model.Warehouse;
import com.erppos.backend.erp.inventory.infrastructure.persistence.WarehouseEntity;

public final class WarehouseMapper {
    private WarehouseMapper() {
    }

    public static Warehouse toDomain(WarehouseEntity entity) {
        return new Warehouse(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getType(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static WarehouseEntity toEntity(Warehouse warehouse) {
        WarehouseEntity entity = new WarehouseEntity();
        merge(entity, warehouse);
        return entity;
    }

    public static void merge(WarehouseEntity entity, Warehouse warehouse) {
        entity.setCode(warehouse.code());
        entity.setName(warehouse.name());
        entity.setType(warehouse.type());
        entity.setActive(warehouse.active());
        entity.setCreatedBy(warehouse.createdBy());
        entity.setUpdatedBy(warehouse.updatedBy());
    }
}

