package com.erppos.backend.erp.integrations.domain.exception;

public class IntegrationNotFoundException extends RuntimeException {
    public IntegrationNotFoundException(String message) {
        super(message);
    }
}

