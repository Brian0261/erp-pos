package com.erppos.backend.erp.billing.domain.model;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;

public record StorageStoreResult(
        FiscalEvidenceStorageMetadata metadata,
        boolean simulated
) {
    public StorageStoreResult {
        if (metadata == null) {
            throw new BillingBusinessRuleException("metadata is required");
        }
    }
}
