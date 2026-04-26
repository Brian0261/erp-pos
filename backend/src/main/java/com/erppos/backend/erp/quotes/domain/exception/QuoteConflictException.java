package com.erppos.backend.erp.quotes.domain.exception;

public class QuoteConflictException extends RuntimeException {
    public QuoteConflictException(String message) {
        super(message);
    }
}

