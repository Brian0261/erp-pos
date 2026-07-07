package com.erppos.backend.erp.billing.infrastructure.mapper;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentAttempt;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentAttemptEntity;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentEntity;

public final class ElectronicDocumentAttemptMapper {
    private ElectronicDocumentAttemptMapper() {
    }

    public static ElectronicDocumentAttempt toDomain(ElectronicDocumentAttemptEntity entity) {
        return new ElectronicDocumentAttempt(
                entity.getId(),
                entity.getElectronicDocument().getId(),
                entity.getOperation(),
                entity.getAttemptNumber(),
                entity.getResult(),
                entity.getErrorCategory(),
                entity.isRecoverable(),
                entity.getProviderStatus(),
                entity.getProviderCode(),
                entity.getProviderMessage(),
                entity.getProviderTicket(),
                entity.getProviderCorrelationId(),
                entity.getRequestHash(),
                entity.getResponseHash(),
                entity.getStartedAt(),
                entity.getFinishedAt(),
                entity.getActor(),
                entity.getTraceId(),
                entity.isSimulated()
        );
    }

    public static ElectronicDocumentAttemptEntity toEntity(ElectronicDocumentAttempt attempt, ElectronicDocumentEntity documentEntity) {
        ElectronicDocumentAttemptEntity entity = new ElectronicDocumentAttemptEntity();
        merge(entity, attempt, documentEntity);
        return entity;
    }

    public static void merge(ElectronicDocumentAttemptEntity entity, ElectronicDocumentAttempt attempt, ElectronicDocumentEntity documentEntity) {
        entity.setElectronicDocument(documentEntity);
        entity.setOperation(attempt.operation());
        entity.setAttemptNumber(attempt.attemptNumber());
        entity.setResult(attempt.result());
        entity.setErrorCategory(attempt.errorCategory());
        entity.setRecoverable(attempt.recoverable());
        entity.setProviderStatus(attempt.providerStatus());
        entity.setProviderCode(attempt.providerCode());
        entity.setProviderMessage(attempt.providerMessage());
        entity.setProviderTicket(attempt.providerTicket());
        entity.setProviderCorrelationId(attempt.providerCorrelationId());
        entity.setRequestHash(attempt.requestHash());
        entity.setResponseHash(attempt.responseHash());
        entity.setStartedAt(attempt.startedAt());
        entity.setFinishedAt(attempt.finishedAt());
        entity.setActor(attempt.actor());
        entity.setTraceId(attempt.traceId());
        entity.setSimulated(attempt.simulated());
    }
}
