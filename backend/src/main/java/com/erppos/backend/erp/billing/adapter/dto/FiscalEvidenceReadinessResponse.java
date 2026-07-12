package com.erppos.backend.erp.billing.adapter.dto;

import java.time.Instant;
import java.util.List;

public record FiscalEvidenceReadinessResponse(
        Long documentId,
        boolean simulated,
        int evidenceCount,
        Instant lastUpdatedAt,
        List<FiscalEvidenceReadinessItemResponse> evidence
) {
}
