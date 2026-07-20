package com.erppos.backend.erp.billing.domain.exception;

public class BillingPreconditionFailedException extends RuntimeException {

    public BillingPreconditionFailedException(String message) {
        super(message);
    }
}
