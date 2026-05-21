package com.erppos.backend.erp.inventory.application.usecase;

public record UpdateWarehouseCommand(
        String code,
        String name
) {
}
