package com.erppos.backend.erp.billing.application.usecase;

import java.time.Instant;
import java.util.List;

public record FiscalEvidenceReadiness(
        Long documentId,
        boolean simulated,
        int evidenceCount,
        Instant lastUpdatedAt,
        List<FiscalEvidenceReadinessItem> evidence
) {
    public FiscalEvidenceReadiness {
        evidence = evidence == null ? List.of() : List.copyOf(evidence);
        evidenceCount = evidence.size();
    }
}
