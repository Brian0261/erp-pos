package com.erppos.backend.erp.inventory.domain.model;

public record InventoryProductSnapshot(
        Long id,
        String name,
        boolean active
) {
}

