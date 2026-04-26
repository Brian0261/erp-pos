package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.model.CashRegisterSession;
import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;
import com.erppos.backend.erp.sales.domain.port.CashRegisterRepositoryPort;
import com.erppos.backend.erp.sales.infrastructure.mapper.CashRegisterMapper;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
public class CashRegisterPersistenceAdapter implements CashRegisterRepositoryPort {

    private final CashRegisterSessionJpaRepository repository;

    public CashRegisterPersistenceAdapter(CashRegisterSessionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public CashRegisterSession save(CashRegisterSession session) {
        CashRegisterSessionEntity entity;
        if (session.id() == null) {
            entity = CashRegisterMapper.toEntity(session);
        } else {
            entity = repository.findById(session.id()).orElseGet(CashRegisterSessionEntity::new);
            CashRegisterMapper.merge(entity, session);
        }
        return CashRegisterMapper.toDomain(repository.save(entity));
    }

    @Override
    public Optional<CashRegisterSession> findById(Long id) {
        return repository.findById(id).map(CashRegisterMapper::toDomain);
    }

    @Override
    public Optional<CashRegisterSession> findOpenByUserId(UUID userId) {
        return repository.findByOpenedByUserIdAndStatus(userId, CashRegisterStatus.OPEN).map(CashRegisterMapper::toDomain);
    }

    @Override
    public Optional<CashRegisterSession> findLatestByUserId(UUID userId) {
        return repository.findFirstByOpenedByUserIdOrderByOpenedAtDesc(userId).map(CashRegisterMapper::toDomain);
    }

    @Override
    public Instant findFirstSaleAt(Long cashRegisterSessionId) {
        return repository.findFirstSaleAt(cashRegisterSessionId);
    }

    @Override
    public Instant findLastSaleAt(Long cashRegisterSessionId) {
        return repository.findLastSaleAt(cashRegisterSessionId);
    }

    @Override
    public BigDecimal sumSalesTotal(Long cashRegisterSessionId) {
        return repository.sumSalesTotal(cashRegisterSessionId);
    }

    @Override
    public BigDecimal sumSalesCashPaid(Long cashRegisterSessionId) {
        return repository.sumSalesCashPaid(cashRegisterSessionId);
    }
}

