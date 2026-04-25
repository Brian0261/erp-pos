package com.erppos.backend.erp.inventory.application.usecase;

import com.erppos.backend.erp.inventory.domain.model.WarehouseType;

public record CreateWarehouseCommand(
        String code,
        String name,
        WarehouseType type
) {
}

