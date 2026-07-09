package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentEvidence;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceMetadataStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentEvidenceRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.ElectronicDocumentEvidenceMapper;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ElectronicDocumentEvidencePersistenceAdapter implements ElectronicDocumentEvidenceRepositoryPort {

    private final ElectronicDocumentEvidenceJpaRepository evidenceJpaRepository;
    private final ElectronicDocumentJpaRepository documentJpaRepository;
    private final ElectronicDocumentAttemptJpaRepository attemptJpaRepository;

    public ElectronicDocumentEvidencePersistenceAdapter(
            ElectronicDocumentEvidenceJpaRepository evidenceJpaRepository,
            ElectronicDocumentJpaRepository documentJpaRepository,
            ElectronicDocumentAttemptJpaRepository attemptJpaRepository
    ) {
        this.evidenceJpaRepository = evidenceJpaRepository;
        this.documentJpaRepository = documentJpaRepository;
        this.attemptJpaRepository = attemptJpaRepository;
    }

    @Override
    public ElectronicDocumentEvidence save(ElectronicDocumentEvidence evidence) {
        if (evidence.id() != null) {
            throw new BillingBusinessRuleException("Electronic document evidence is append-only.");
        }
        ElectronicDocumentEntity documentEntity = documentJpaRepository.findById(evidence.electronicDocumentId())
                .orElseThrow(() -> new BillingNotFoundException("Electronic document not found"));
        ElectronicDocumentAttemptEntity attemptEntity = null;
        if (evidence.attemptId() != null) {
            Long attemptDocumentId = attemptJpaRepository.findElectronicDocumentIdById(evidence.attemptId())
                    .orElseThrow(() -> new BillingNotFoundException("Electronic document attempt not found"));
            if (!attemptDocumentId.equals(evidence.electronicDocumentId())) {
                throw new BillingBusinessRuleException("Evidence attempt must belong to the same document.");
            }
            attemptEntity = attemptJpaRepository.getReferenceById(evidence.attemptId());
        }
        if (evidence.attemptId() != null
                && evidence.checksumSha256() != null
                && evidenceJpaRepository.existsByAttempt_IdAndEvidenceTypeAndChecksumSha256(evidence.attemptId(), evidence.evidenceType(), evidence.checksumSha256())) {
            throw new BillingConflictException("La evidencia fiscal ya esta registrada para este intento.");
        }
        if (evidence.evidenceType() == FiscalEvidenceType.SIGNED_XML
                && evidence.metadataStatus() != FiscalEvidenceMetadataStatus.REVOKED
                && evidenceJpaRepository.existsByElectronicDocument_IdAndEvidenceTypeAndMetadataStatusNot(
                evidence.electronicDocumentId(),
                FiscalEvidenceType.SIGNED_XML,
                FiscalEvidenceMetadataStatus.REVOKED
        )) {
            throw new BillingConflictException("La evidencia SIGNED_XML activa ya esta registrada para este comprobante.");
        }

        ElectronicDocumentEvidenceEntity entity = ElectronicDocumentEvidenceMapper.toEntity(evidence, documentEntity, attemptEntity);
        return ElectronicDocumentEvidenceMapper.toDomain(evidenceJpaRepository.save(entity));
    }

    @Override
    public List<ElectronicDocumentEvidence> findByElectronicDocumentId(Long electronicDocumentId) {
        return evidenceJpaRepository.findByElectronicDocument_IdOrderByCreatedAtAscIdAsc(electronicDocumentId)
                .stream()
                .map(ElectronicDocumentEvidenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<ElectronicDocumentEvidence> findByAttemptId(Long attemptId) {
        return evidenceJpaRepository.findByAttempt_IdOrderByCreatedAtAscIdAsc(attemptId)
                .stream()
                .map(ElectronicDocumentEvidenceMapper::toDomain)
                .toList();
    }
}
