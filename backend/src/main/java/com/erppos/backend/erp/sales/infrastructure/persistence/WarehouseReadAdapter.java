package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.inventory.application.usecase.WarehouseUseCase;
import com.erppos.backend.erp.inventory.domain.exception.InventoryNotFoundException;
import com.erppos.backend.erp.inventory.domain.model.Warehouse;
import com.erppos.backend.erp.sales.domain.port.WarehouseReadPort;
import org.springframework.stereotype.Component;

@Component
public class WarehouseReadAdapter implements WarehouseReadPort {

    private final WarehouseUseCase warehouseUseCase;

    public WarehouseReadAdapter(WarehouseUseCase warehouseUseCase) {
        this.warehouseUseCase = warehouseUseCase;
    }

    @Override
    public boolean existsAndActive(Long warehouseId) {
        try {
            Warehouse warehouse = warehouseUseCase.getById(warehouseId);
            return warehouse.active();
        } catch (InventoryNotFoundException ex) {
            return false;
        }
    }
}

