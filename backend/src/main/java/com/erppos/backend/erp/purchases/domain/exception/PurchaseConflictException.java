package com.erppos.backend.erp.purchases.domain.exception;

public class PurchaseConflictException extends RuntimeException {
    public PurchaseConflictException(String message) {
        super(message);
    }
}

