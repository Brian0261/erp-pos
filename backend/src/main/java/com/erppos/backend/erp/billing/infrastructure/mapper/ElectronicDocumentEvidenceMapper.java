package com.erppos.backend.erp.billing.infrastructure.mapper;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentEvidence;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentAttemptEntity;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentEntity;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentEvidenceEntity;

public final class ElectronicDocumentEvidenceMapper {
    private ElectronicDocumentEvidenceMapper() {
    }

    public static ElectronicDocumentEvidence toDomain(ElectronicDocumentEvidenceEntity entity) {
        return new ElectronicDocumentEvidence(
                entity.getId(),
                entity.getElectronicDocument().getId(),
                entity.getAttempt() == null ? null : entity.getAttempt().getId(),
                entity.getEvidenceType(),
                entity.getEnvironment(),
                entity.isSimulated(),
                entity.getStorageProvider(),
                entity.getStorageKey(),
                entity.getFileName(),
                entity.getMimeType(),
                entity.getSizeBytes(),
                entity.getChecksumSha256(),
                entity.getContentHashSha256(),
                entity.getProviderTicket(),
                entity.getProviderCorrelationId(),
                entity.getProviderStatus(),
                entity.getMetadataStatus(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getTraceId(),
                entity.getNotes()
        );
    }

    public static ElectronicDocumentEvidenceEntity toEntity(
            ElectronicDocumentEvidence evidence,
            ElectronicDocumentEntity documentEntity,
            ElectronicDocumentAttemptEntity attemptEntity
    ) {
        ElectronicDocumentEvidenceEntity entity = new ElectronicDocumentEvidenceEntity();
        entity.setElectronicDocument(documentEntity);
        entity.setAttempt(attemptEntity);
        entity.setEvidenceType(evidence.evidenceType());
        entity.setEnvironment(evidence.environment());
        entity.setSimulated(evidence.simulated());
        entity.setStorageProvider(evidence.storageProvider());
        entity.setStorageKey(evidence.storageKey());
        entity.setFileName(evidence.fileName());
        entity.setMimeType(evidence.mimeType());
        entity.setSizeBytes(evidence.sizeBytes());
        entity.setChecksumSha256(evidence.checksumSha256());
        entity.setContentHashSha256(evidence.contentHashSha256());
        entity.setProviderTicket(evidence.providerTicket());
        entity.setProviderCorrelationId(evidence.providerCorrelationId());
        entity.setProviderStatus(evidence.providerStatus());
        entity.setMetadataStatus(evidence.metadataStatus());
        entity.setCreatedAt(evidence.createdAt());
        entity.setCreatedBy(evidence.createdBy());
        entity.setTraceId(evidence.traceId());
        entity.setNotes(evidence.notes());
        return entity;
    }
}
