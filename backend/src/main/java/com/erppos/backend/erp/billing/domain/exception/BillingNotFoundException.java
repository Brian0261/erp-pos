package com.erppos.backend.erp.billing.domain.exception;

public class BillingNotFoundException extends RuntimeException {
    public BillingNotFoundException(String message) {
        super(message);
    }
}

