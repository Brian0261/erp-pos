package com.erppos.backend.erp.billing.domain.model;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;

public record FiscalEvidenceVerificationResult(
        FiscalEvidenceStorageRef ref,
        String checksumSha256,
        boolean matches,
        boolean simulated
) {
    public FiscalEvidenceVerificationResult {
        if (ref == null) {
            throw new BillingBusinessRuleException("ref is required");
        }
        checksumSha256 = FiscalEvidenceStorageMetadataGuard.normalizeHash(checksumSha256, "checksumSha256");
    }
}
