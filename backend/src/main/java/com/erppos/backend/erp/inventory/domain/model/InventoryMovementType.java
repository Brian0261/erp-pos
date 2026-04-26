package com.erppos.backend.erp.inventory.domain.model;

public enum InventoryMovementType {
    INITIAL_STOCK,
    ADJUSTMENT_IN,
    ADJUSTMENT_OUT,
    TRANSFER_OUT,
    TRANSFER_IN,
    PURCHASE_IN,
    SALE_OUT,
    SALE_VOID_IN
}

