package com.erppos.backend.erp.integrations.domain.exception;

public class IntegrationBusinessRuleException extends RuntimeException {
    public IntegrationBusinessRuleException(String message) {
        super(message);
    }
}

