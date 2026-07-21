package com.erppos.backend.erp.billing.domain.exception;

public class BillingPreconditionRequiredException extends RuntimeException {

    public BillingPreconditionRequiredException(String message) {
        super(message);
    }
}
