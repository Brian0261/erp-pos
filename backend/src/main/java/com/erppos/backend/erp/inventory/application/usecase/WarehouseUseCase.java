package com.erppos.backend.erp.inventory.application.usecase;

import com.erppos.backend.erp.inventory.domain.model.Warehouse;

import java.util.List;

public interface WarehouseUseCase {
    Warehouse create(CreateWarehouseCommand command);
    List<Warehouse> list(Boolean active);
    Warehouse getById(Long id);
    void deactivate(Long id);
    Warehouse changeStatus(Long id, ChangeWarehouseStatusCommand command);
}

