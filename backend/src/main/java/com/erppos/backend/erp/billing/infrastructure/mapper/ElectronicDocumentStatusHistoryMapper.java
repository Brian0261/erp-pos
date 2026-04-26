package com.erppos.backend.erp.billing.infrastructure.mapper;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentEntity;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentStatusHistoryEntity;

public final class ElectronicDocumentStatusHistoryMapper {
    private ElectronicDocumentStatusHistoryMapper() {
    }

    public static ElectronicDocumentStatusHistory toDomain(ElectronicDocumentStatusHistoryEntity entity) {
        return new ElectronicDocumentStatusHistory(
                entity.getId(),
                entity.getElectronicDocument().getId(),
                entity.getPreviousStatus(),
                entity.getNewStatus(),
                entity.getMessage(),
                entity.getChangedAt(),
                entity.getChangedBy()
        );
    }

    public static ElectronicDocumentStatusHistoryEntity toEntity(ElectronicDocumentStatusHistory history, ElectronicDocumentEntity documentEntity) {
        ElectronicDocumentStatusHistoryEntity entity = new ElectronicDocumentStatusHistoryEntity();
        entity.setElectronicDocument(documentEntity);
        entity.setPreviousStatus(history.previousStatus());
        entity.setNewStatus(history.newStatus());
        entity.setMessage(history.message());
        entity.setChangedAt(history.changedAt());
        entity.setChangedBy(history.changedBy());
        return entity;
    }
}

