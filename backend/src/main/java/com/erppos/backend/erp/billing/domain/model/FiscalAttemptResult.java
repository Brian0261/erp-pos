package com.erppos.backend.erp.billing.domain.model;

public enum FiscalAttemptResult {
    STARTED,
    SUCCESS,
    FAILED,
    BLOCKED,
    PENDING,
    SKIPPED_IDEMPOTENT
}
