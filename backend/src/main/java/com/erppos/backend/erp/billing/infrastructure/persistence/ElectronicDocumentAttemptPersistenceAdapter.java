package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentAttempt;
import com.erppos.backend.erp.billing.domain.model.FiscalOperation;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentAttemptRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.ElectronicDocumentAttemptMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class ElectronicDocumentAttemptPersistenceAdapter implements ElectronicDocumentAttemptRepositoryPort {

    private final ElectronicDocumentAttemptJpaRepository attemptJpaRepository;
    private final ElectronicDocumentJpaRepository documentJpaRepository;

    public ElectronicDocumentAttemptPersistenceAdapter(
            ElectronicDocumentAttemptJpaRepository attemptJpaRepository,
            ElectronicDocumentJpaRepository documentJpaRepository
    ) {
        this.attemptJpaRepository = attemptJpaRepository;
        this.documentJpaRepository = documentJpaRepository;
    }

    @Override
    public ElectronicDocumentAttempt save(ElectronicDocumentAttempt attempt) {
        ElectronicDocumentEntity documentEntity = documentJpaRepository.getReferenceById(attempt.electronicDocumentId());
        ElectronicDocumentAttemptEntity entity;
        if (attempt.id() == null) {
            entity = ElectronicDocumentAttemptMapper.toEntity(attempt, documentEntity);
        } else {
            entity = attemptJpaRepository.findById(attempt.id()).orElseGet(ElectronicDocumentAttemptEntity::new);
            ElectronicDocumentAttemptMapper.merge(entity, attempt, documentEntity);
        }
        return ElectronicDocumentAttemptMapper.toDomain(attemptJpaRepository.save(entity));
    }

    @Override
    public int nextAttemptNumber(Long electronicDocumentId, FiscalOperation operation) {
        Integer maxAttemptNumber = attemptJpaRepository.findMaxAttemptNumber(electronicDocumentId, operation);
        return maxAttemptNumber == null ? 1 : maxAttemptNumber + 1;
    }

    @Override
    public Optional<ElectronicDocumentAttempt> findByIdForUpdate(Long id) {
        return attemptJpaRepository.findByIdForUpdate(id)
                .map(ElectronicDocumentAttemptMapper::toDomain);
    }

    @Override
    public List<ElectronicDocumentAttempt> findByElectronicDocumentId(Long electronicDocumentId) {
        return attemptJpaRepository.findByElectronicDocument_IdOrderByAttemptNumberAsc(electronicDocumentId)
                .stream()
                .map(ElectronicDocumentAttemptMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<ElectronicDocumentAttempt> findLatestByElectronicDocumentIdAndOperation(Long electronicDocumentId, FiscalOperation operation) {
        return attemptJpaRepository.findFirstByElectronicDocument_IdAndOperationOrderByAttemptNumberDesc(electronicDocumentId, operation)
                .map(ElectronicDocumentAttemptMapper::toDomain);
    }
}
