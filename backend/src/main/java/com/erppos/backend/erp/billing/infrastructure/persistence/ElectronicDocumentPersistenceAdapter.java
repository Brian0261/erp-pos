package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.ElectronicDocumentMapper;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Component
public class ElectronicDocumentPersistenceAdapter implements ElectronicDocumentRepositoryPort {

    private static final Instant MIN_INSTANT_FILTER = Instant.parse("1970-01-01T00:00:00Z");
    private static final Instant MAX_INSTANT_FILTER = Instant.parse("9999-12-31T23:59:59Z");

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
        Instant fromInstant = from == null ? MIN_INSTANT_FILTER : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant toInstant = to == null ? MAX_INSTANT_FILTER : to.plusDays(1).atStartOfDay().minusSeconds(1).toInstant(ZoneOffset.UTC);
        return documentJpaRepository.findByFilters(
                        status,
                        type,
                        saleId,
                        fromInstant,
                        toInstant
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

