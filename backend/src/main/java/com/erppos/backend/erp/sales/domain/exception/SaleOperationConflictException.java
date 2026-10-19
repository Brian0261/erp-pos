package com.erppos.backend.erp.sales.domain.exception;

public class SaleOperationConflictException extends SalesConflictException {
    private final String code;
    public SaleOperationConflictException(String code, String message) {
        super(code + ": " + message);
        this.code = code;
    }
    public String code() { return code; }
}
