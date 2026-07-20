package com.erppos.backend.erp.billing.application.service;

record FiscalSendPreparationOutcome(
        FiscalSendPreparation preparation,
        FiscalSendFailure failure
) {

    FiscalSendPreparationOutcome {
        if ((preparation == null) == (failure == null)) {
            throw new IllegalArgumentException("Exactly one fiscal send outcome value is required");
        }
    }

    static FiscalSendPreparationOutcome ready(FiscalSendPreparation preparation) {
        return new FiscalSendPreparationOutcome(preparation, null);
    }

    static FiscalSendPreparationOutcome blocked(FiscalSendFailureType type, String message) {
        return new FiscalSendPreparationOutcome(null, new FiscalSendFailure(type, message));
    }

    boolean isReady() {
        return preparation != null;
    }
}
