package com.erppos.backend.erp.billing.application.usecase;

public interface FiscalEvidenceReadinessUseCase {
    FiscalEvidenceReadiness getByDocumentId(Long documentId);
}
