package com.erppos.backend.erp.billing.infrastructure.mapper;

import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.infrastructure.persistence.BillingXmlFileEntity;
import com.erppos.backend.erp.billing.infrastructure.persistence.ElectronicDocumentEntity;

public final class BillingXmlFileMapper {
    private BillingXmlFileMapper() {
    }

    public static BillingXmlFile toDomain(BillingXmlFileEntity entity) {
        return new BillingXmlFile(
                entity.getId(),
                entity.getElectronicDocument().getId(),
                entity.getFileType(),
                entity.getFileName(),
                entity.getContent(),
                entity.getMimeType(),
                entity.getCreatedAt(),
                entity.getCreatedBy()
        );
    }

    public static BillingXmlFileEntity toEntity(BillingXmlFile xmlFile, ElectronicDocumentEntity documentEntity) {
        BillingXmlFileEntity entity = new BillingXmlFileEntity();
        entity.setElectronicDocument(documentEntity);
        entity.setFileType(xmlFile.fileType());
        entity.setFileName(xmlFile.fileName());
        entity.setContent(xmlFile.content());
        entity.setMimeType(xmlFile.mimeType());
        entity.setCreatedAt(xmlFile.createdAt());
        entity.setCreatedBy(xmlFile.createdBy());
        return entity;
    }
}

