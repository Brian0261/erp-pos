package com.erppos.backend.erp.catalog.domain.exception;
public class CatalogNotFoundException extends RuntimeException {
    public CatalogNotFoundException(String message) {
        super(message);
    }
}
