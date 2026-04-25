package com.erppos.backend.erp.purchases.domain.port;

import com.erppos.backend.erp.purchases.domain.model.PurchaseWarehouseSnapshot;

import java.util.Optional;

public interface PurchaseWarehouseReadPort {
    Optional<PurchaseWarehouseSnapshot> findById(Long warehouseId);
}

