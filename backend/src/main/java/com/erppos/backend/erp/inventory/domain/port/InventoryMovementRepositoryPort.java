package com.erppos.backend.erp.inventory.domain.port;

import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;

import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InventoryMovementRepositoryPort {
    InventoryMovement save(InventoryMovement movement);
    boolean existsByProductIdAndWarehouseId(Long productId, Long warehouseId);
    Page<InventoryMovement> findKardex(Long productId, Long warehouseId, Instant fromInclusive, Instant toExclusive, Pageable pageable);
}

