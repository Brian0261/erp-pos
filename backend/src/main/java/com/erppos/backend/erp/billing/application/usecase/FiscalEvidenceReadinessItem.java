package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;

import java.util.List;

public record FiscalEvidenceReadinessItem(
        Long evidenceId,
        FiscalEvidenceType evidenceType,
        FiscalEvidenceAvailabilityStatus availabilityStatus,
        FiscalEvidenceIntegrityStatus integrityStatus,
        boolean downloadAllowed,
        FiscalEvidenceReadinessReasonCode reasonCode,
        List<String> allowedActions
) {
    public FiscalEvidenceReadinessItem {
        allowedActions = allowedActions == null ? List.of() : List.copyOf(allowedActions);
    }
}
