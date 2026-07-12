package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceAvailabilityStatus;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceIntegrityStatus;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadinessReasonCode;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;

import java.util.List;

public record FiscalEvidenceReadinessItemResponse(
        Long evidenceId,
        FiscalEvidenceType evidenceType,
        FiscalEvidenceAvailabilityStatus availabilityStatus,
        FiscalEvidenceIntegrityStatus integrityStatus,
        boolean downloadAllowed,
        FiscalEvidenceReadinessReasonCode reasonCode,
        List<String> allowedActions
) {
}
