package com.erppos.backend.erp.inventory.domain.port;

import com.erppos.backend.erp.inventory.domain.model.InventoryProductSnapshot;

import java.util.Optional;

public interface InventoryProductReadPort {
    Optional<InventoryProductSnapshot> findById(Long productId);
}

