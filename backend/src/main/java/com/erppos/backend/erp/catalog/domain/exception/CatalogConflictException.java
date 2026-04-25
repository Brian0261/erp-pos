package com.erppos.backend.erp.catalog.domain.exception;
public class CatalogConflictException extends RuntimeException {
    public CatalogConflictException(String message) {
        super(message);
    }
}
