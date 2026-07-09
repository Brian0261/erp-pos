package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceMetadataStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ElectronicDocumentEvidenceJpaRepository extends JpaRepository<ElectronicDocumentEvidenceEntity, Long> {
    List<ElectronicDocumentEvidenceEntity> findByElectronicDocument_IdOrderByCreatedAtAscIdAsc(Long electronicDocumentId);
    List<ElectronicDocumentEvidenceEntity> findByAttempt_IdOrderByCreatedAtAscIdAsc(Long attemptId);
    boolean existsByAttempt_IdAndEvidenceTypeAndChecksumSha256(Long attemptId, FiscalEvidenceType evidenceType, String checksumSha256);
    boolean existsByElectronicDocument_IdAndEvidenceTypeAndMetadataStatusNot(Long electronicDocumentId, FiscalEvidenceType evidenceType, FiscalEvidenceMetadataStatus metadataStatus);
}
