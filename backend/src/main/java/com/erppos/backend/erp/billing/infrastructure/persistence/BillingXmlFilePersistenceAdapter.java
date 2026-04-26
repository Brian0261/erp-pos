package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFileType;
import com.erppos.backend.erp.billing.domain.port.BillingXmlFileRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.BillingXmlFileMapper;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class BillingXmlFilePersistenceAdapter implements BillingXmlFileRepositoryPort {

    private final BillingXmlFileJpaRepository xmlFileJpaRepository;
    private final ElectronicDocumentJpaRepository documentJpaRepository;

    public BillingXmlFilePersistenceAdapter(
            BillingXmlFileJpaRepository xmlFileJpaRepository,
            ElectronicDocumentJpaRepository documentJpaRepository
    ) {
        this.xmlFileJpaRepository = xmlFileJpaRepository;
        this.documentJpaRepository = documentJpaRepository;
    }

    @Override
    public BillingXmlFile save(BillingXmlFile xmlFile) {
        BillingXmlFileEntity entity = xmlFileJpaRepository
                .findByElectronicDocument_IdAndFileType(xmlFile.electronicDocumentId(), xmlFile.fileType())
                .orElseGet(BillingXmlFileEntity::new);

        ElectronicDocumentEntity documentEntity = documentJpaRepository.getReferenceById(xmlFile.electronicDocumentId());
        entity.setElectronicDocument(documentEntity);
        entity.setFileType(xmlFile.fileType());
        entity.setFileName(xmlFile.fileName());
        entity.setContent(xmlFile.content());
        entity.setMimeType(xmlFile.mimeType());
        entity.setCreatedBy(xmlFile.createdBy());
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(xmlFile.createdAt());
        }

        return BillingXmlFileMapper.toDomain(xmlFileJpaRepository.save(entity));
    }

    @Override
    public Optional<BillingXmlFile> findByElectronicDocumentIdAndFileType(Long electronicDocumentId, BillingXmlFileType fileType) {
        return xmlFileJpaRepository.findByElectronicDocument_IdAndFileType(electronicDocumentId, fileType)
                .map(BillingXmlFileMapper::toDomain);
    }
}

