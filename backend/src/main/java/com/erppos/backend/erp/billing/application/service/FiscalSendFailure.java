package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;

record FiscalSendFailure(FiscalSendFailureType type, String message) {

    RuntimeException toException() {
        return switch (type) {
            case CONFLICT -> new BillingConflictException(message);
            case NOT_FOUND -> new BillingNotFoundException(message);
        };
    }
}
