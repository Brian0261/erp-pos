package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentItemRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.ElectronicDocumentItemMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class ElectronicDocumentItemPersistenceAdapter implements ElectronicDocumentItemRepositoryPort {

    private final ElectronicDocumentItemJpaRepository itemJpaRepository;
    private final ElectronicDocumentJpaRepository documentJpaRepository;

    public ElectronicDocumentItemPersistenceAdapter(
            ElectronicDocumentItemJpaRepository itemJpaRepository,
            ElectronicDocumentJpaRepository documentJpaRepository
    ) {
        this.itemJpaRepository = itemJpaRepository;
        this.documentJpaRepository = documentJpaRepository;
    }

    @Override
    @Transactional
    public List<ElectronicDocumentItem> saveAll(Long documentId, List<ElectronicDocumentItem> items) {
        ElectronicDocumentEntity documentEntity = documentJpaRepository.getReferenceById(documentId);
        itemJpaRepository.deleteByElectronicDocument_Id(documentId);
        List<ElectronicDocumentItemEntity> entities = items.stream()
                .map(item -> ElectronicDocumentItemMapper.toEntity(item, documentEntity))
                .toList();
        return itemJpaRepository.saveAll(entities).stream().map(ElectronicDocumentItemMapper::toDomain).toList();
    }

    @Override
    public List<ElectronicDocumentItem> findByElectronicDocumentId(Long documentId) {
        return itemJpaRepository.findByElectronicDocument_IdOrderByIdAsc(documentId)
                .stream()
                .map(ElectronicDocumentItemMapper::toDomain)
                .toList();
    }
}

