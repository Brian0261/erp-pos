package com.erppos.backend.erp.inventory.domain.exception;

public class InventoryConflictException extends RuntimeException {
    public InventoryConflictException(String message) {
        super(message);
    }
}

