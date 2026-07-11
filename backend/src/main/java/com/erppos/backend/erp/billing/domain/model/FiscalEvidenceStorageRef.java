package com.erppos.backend.erp.billing.domain.model;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;

public record FiscalEvidenceStorageRef(
        Long documentId,
        Long attemptId,
        FiscalEvidenceType evidenceType,
        BillingEnvironment environment,
        FiscalEvidenceStorageProvider storageProvider,
        String storageKey,
        boolean simulated
) {
    public FiscalEvidenceStorageRef {
        documentId = FiscalEvidenceStorageMetadataGuard.requirePositive(documentId, "documentId");
        if (attemptId != null && attemptId <= 0) {
            throw new BillingBusinessRuleException("attemptId must be > 0");
        }
        if (evidenceType == null) {
            throw new BillingBusinessRuleException("evidenceType is required");
        }
        if (environment == null) {
            throw new BillingBusinessRuleException("environment is required");
        }
        storageProvider = storageProvider == null ? FiscalEvidenceStorageProvider.NONE : storageProvider;
        storageKey = FiscalEvidenceStorageMetadataGuard.normalizeStorageKey(storageKey);
    }
}
