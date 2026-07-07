package com.erppos.backend.erp.billing.domain.model;

public enum FiscalErrorCategory {
    VALIDATION_ERROR,
    PROVIDER_REJECTED,
    PROVIDER_OBSERVED,
    PROVIDER_PENDING,
    PROVIDER_TIMEOUT,
    PROVIDER_UNAVAILABLE,
    COMMUNICATION_ERROR,
    INTERNAL_ERROR,
    CONFIGURATION_ERROR
}
