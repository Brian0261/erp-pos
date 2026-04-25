package com.erppos.backend.erp.inventory.infrastructure.mapper;

import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;
import com.erppos.backend.erp.inventory.infrastructure.persistence.InventoryMovementEntity;
import com.erppos.backend.erp.inventory.infrastructure.persistence.WarehouseEntity;

public final class InventoryMovementMapper {
    private InventoryMovementMapper() {
    }

    public static InventoryMovement toDomain(InventoryMovementEntity entity) {
        return new InventoryMovement(
                entity.getId(),
                entity.getProduct().getId(),
                entity.getWarehouse().getId(),
                entity.getMovementType(),
                entity.getQuantity(),
                entity.getPreviousStock(),
                entity.getNewStock(),
                entity.getReason(),
                entity.getReferenceType(),
                entity.getReferenceId(),
                entity.getCreatedAt(),
                entity.getCreatedBy()
        );
    }

    public static InventoryMovementEntity toEntity(InventoryMovement movement, ProductEntity product, WarehouseEntity warehouse) {
        InventoryMovementEntity entity = new InventoryMovementEntity();
        entity.setProduct(product);
        entity.setWarehouse(warehouse);
        entity.setMovementType(movement.movementType());
        entity.setQuantity(movement.quantity());
        entity.setPreviousStock(movement.previousStock());
        entity.setNewStock(movement.newStock());
        entity.setReason(movement.reason());
        entity.setReferenceType(movement.referenceType());
        entity.setReferenceId(movement.referenceId());
        entity.setCreatedBy(movement.createdBy());
        return entity;
    }
}

