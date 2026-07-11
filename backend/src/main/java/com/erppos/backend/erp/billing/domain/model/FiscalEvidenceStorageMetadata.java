package com.erppos.backend.erp.billing.domain.model;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;

public record FiscalEvidenceStorageMetadata(
        Long documentId,
        Long attemptId,
        FiscalEvidenceType evidenceType,
        BillingEnvironment environment,
        FiscalEvidenceStorageProvider storageProvider,
        String storageKey,
        String fileName,
        String mimeType,
        Long sizeBytes,
        String checksumSha256,
        String contentHashSha256,
        boolean simulated
) {
    public FiscalEvidenceStorageMetadata {
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
        fileName = FiscalEvidenceStorageMetadataGuard.normalizeOptional(fileName, "fileName");
        mimeType = FiscalEvidenceStorageMetadataGuard.normalizeOptional(mimeType, "mimeType");
        sizeBytes = FiscalEvidenceStorageMetadataGuard.normalizeNonNegative(sizeBytes, "sizeBytes");
        checksumSha256 = FiscalEvidenceStorageMetadataGuard.normalizeHash(checksumSha256, "checksumSha256");
        contentHashSha256 = FiscalEvidenceStorageMetadataGuard.normalizeHash(contentHashSha256, "contentHashSha256");
    }

    public FiscalEvidenceStorageRef ref() {
        return new FiscalEvidenceStorageRef(
                documentId,
                attemptId,
                evidenceType,
                environment,
                storageProvider,
                storageKey,
                simulated
        );
    }
}
