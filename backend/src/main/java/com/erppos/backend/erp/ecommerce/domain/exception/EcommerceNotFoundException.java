package com.erppos.backend.erp.ecommerce.domain.exception;

public class EcommerceNotFoundException extends RuntimeException {
    public EcommerceNotFoundException(String message) {
        super(message);
    }
}
