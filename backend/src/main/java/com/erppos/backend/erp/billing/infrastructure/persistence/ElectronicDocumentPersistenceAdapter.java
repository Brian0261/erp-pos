package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.ElectronicDocumentMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
public class ElectronicDocumentPersistenceAdapter implements ElectronicDocumentRepositoryPort {

    private final ElectronicDocumentJpaRepository documentJpaRepository;
    private final BillingSeriesJpaRepository seriesJpaRepository;

    public ElectronicDocumentPersistenceAdapter(
            ElectronicDocumentJpaRepository documentJpaRepository,
            BillingSeriesJpaRepository seriesJpaRepository
    ) {
        this.documentJpaRepository = documentJpaRepository;
        this.seriesJpaRepository = seriesJpaRepository;
    }

    @Override
    public ElectronicDocument save(ElectronicDocument document) {
        BillingSeriesEntity seriesEntity = seriesJpaRepository.getReferenceById(document.billingSeriesId());
        ElectronicDocumentEntity entity;
        if (document.id() == null) {
            entity = ElectronicDocumentMapper.toEntity(document, seriesEntity);
        } else {
            entity = documentJpaRepository.findById(document.id()).orElseGet(ElectronicDocumentEntity::new);
            ElectronicDocumentMapper.merge(entity, document, seriesEntity);
        }
        return ElectronicDocumentMapper.toDomain(documentJpaRepository.save(entity));
    }

    @Override
    public Optional<ElectronicDocument> findById(Long id) {
        return documentJpaRepository.findById(id).map(ElectronicDocumentMapper::toDomain);
    }

    @Override
    public List<ElectronicDocument> findByFilters(ElectronicDocumentStatus status, ElectronicDocumentType type, Long saleId, LocalDate from, LocalDate to) {
        return documentJpaRepository.findByFilters(
                        status,
                        type,
                        saleId,
                        from == null ? null : from.atStartOfDay().toInstant(java.time.ZoneOffset.UTC),
                        to == null ? null : to.plusDays(1).atStartOfDay().minusSeconds(1).toInstant(java.time.ZoneOffset.UTC)
                )
                .stream()
                .map(ElectronicDocumentMapper::toDomain)
                .toList();
    }

    @Override
    public boolean existsBySaleIdAndDocumentType(Long saleId, ElectronicDocumentType type) {
        return documentJpaRepository.existsBySaleIdAndDocumentType(saleId, type);
    }
}

