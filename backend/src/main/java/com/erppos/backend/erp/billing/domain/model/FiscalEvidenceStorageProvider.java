package com.erppos.backend.erp.billing.domain.model;

public enum FiscalEvidenceStorageProvider {
    NONE,
    DB_LEGACY,
    FILESYSTEM,
    S3,
    GCS
}
