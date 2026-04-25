package com.erppos.backend.erp.inventory.domain.port;

import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;

import java.time.Instant;
import java.util.List;

public interface InventoryMovementRepositoryPort {
    InventoryMovement save(InventoryMovement movement);
    boolean existsByProductIdAndWarehouseId(Long productId, Long warehouseId);
    List<InventoryMovement> findKardex(Long productId, Long warehouseId, Instant fromInclusive, Instant toExclusive);
}

