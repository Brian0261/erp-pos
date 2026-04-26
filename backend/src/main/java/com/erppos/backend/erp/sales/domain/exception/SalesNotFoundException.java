package com.erppos.backend.erp.sales.domain.exception;

public class SalesNotFoundException extends RuntimeException {
    public SalesNotFoundException(String message) {
        super(message);
    }
}

