package com.erppos.backend.erp.quotes.domain.exception;

public class QuoteNotFoundException extends RuntimeException {
    public QuoteNotFoundException(String message) {
        super(message);
    }
}

