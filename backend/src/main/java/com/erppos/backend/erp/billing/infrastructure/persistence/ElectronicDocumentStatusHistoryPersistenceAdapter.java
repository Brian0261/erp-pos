package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentStatusHistoryRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.ElectronicDocumentStatusHistoryMapper;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ElectronicDocumentStatusHistoryPersistenceAdapter implements ElectronicDocumentStatusHistoryRepositoryPort {

    private final ElectronicDocumentStatusHistoryJpaRepository historyJpaRepository;
    private final ElectronicDocumentJpaRepository documentJpaRepository;

    public ElectronicDocumentStatusHistoryPersistenceAdapter(
            ElectronicDocumentStatusHistoryJpaRepository historyJpaRepository,
            ElectronicDocumentJpaRepository documentJpaRepository
    ) {
        this.historyJpaRepository = historyJpaRepository;
        this.documentJpaRepository = documentJpaRepository;
    }

    @Override
    public ElectronicDocumentStatusHistory save(ElectronicDocumentStatusHistory history) {
        ElectronicDocumentEntity documentEntity = documentJpaRepository.getReferenceById(history.electronicDocumentId());
        ElectronicDocumentStatusHistoryEntity entity = ElectronicDocumentStatusHistoryMapper.toEntity(history, documentEntity);
        return ElectronicDocumentStatusHistoryMapper.toDomain(historyJpaRepository.save(entity));
    }

    @Override
    public List<ElectronicDocumentStatusHistory> findByElectronicDocumentId(Long documentId) {
        return historyJpaRepository.findByElectronicDocument_IdOrderByChangedAtAsc(documentId)
                .stream()
                .map(ElectronicDocumentStatusHistoryMapper::toDomain)
                .toList();
    }
}

