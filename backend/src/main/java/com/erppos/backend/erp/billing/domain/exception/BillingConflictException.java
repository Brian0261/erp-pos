package com.erppos.backend.erp.billing.domain.exception;

public class BillingConflictException extends RuntimeException {
    public BillingConflictException(String message) {
        super(message);
    }
}

