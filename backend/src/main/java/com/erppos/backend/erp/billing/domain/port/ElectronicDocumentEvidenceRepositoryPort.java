package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentEvidence;

import java.util.List;

public interface ElectronicDocumentEvidenceRepositoryPort {
    ElectronicDocumentEvidence save(ElectronicDocumentEvidence evidence);
    List<ElectronicDocumentEvidence> findByElectronicDocumentId(Long electronicDocumentId);
    List<ElectronicDocumentEvidence> findByAttemptId(Long attemptId);
}
