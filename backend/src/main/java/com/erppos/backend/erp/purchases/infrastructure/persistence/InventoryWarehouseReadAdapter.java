package com.erppos.backend.erp.purchases.infrastructure.persistence;

import com.erppos.backend.erp.inventory.application.usecase.WarehouseUseCase;
import com.erppos.backend.erp.inventory.domain.exception.InventoryNotFoundException;
import com.erppos.backend.erp.inventory.domain.model.Warehouse;
import com.erppos.backend.erp.purchases.domain.model.PurchaseWarehouseSnapshot;
import com.erppos.backend.erp.purchases.domain.port.PurchaseWarehouseReadPort;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class InventoryWarehouseReadAdapter implements PurchaseWarehouseReadPort {

    private final WarehouseUseCase warehouseUseCase;

    public InventoryWarehouseReadAdapter(WarehouseUseCase warehouseUseCase) {
        this.warehouseUseCase = warehouseUseCase;
    }

    @Override
    public Optional<PurchaseWarehouseSnapshot> findById(Long warehouseId) {
        try {
            Warehouse warehouse = warehouseUseCase.getById(warehouseId);
            return Optional.of(new PurchaseWarehouseSnapshot(warehouse.id(), warehouse.name(), warehouse.active()));
        } catch (InventoryNotFoundException ex) {
            return Optional.empty();
        }
    }
}

