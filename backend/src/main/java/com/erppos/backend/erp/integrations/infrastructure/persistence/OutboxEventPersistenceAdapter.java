package com.erppos.backend.erp.integrations.infrastructure.persistence;

import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventStatus;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;
import com.erppos.backend.erp.integrations.domain.port.OutboxEventRepositoryPort;
import com.erppos.backend.erp.integrations.infrastructure.mapper.OutboxEventMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class OutboxEventPersistenceAdapter implements OutboxEventRepositoryPort {

    private final OutboxEventJpaRepository outboxEventJpaRepository;

    public OutboxEventPersistenceAdapter(OutboxEventJpaRepository outboxEventJpaRepository) {
        this.outboxEventJpaRepository = outboxEventJpaRepository;
    }

    @Override
    public OutboxEvent save(OutboxEvent event) {
        OutboxEventEntity entity;
        if (event.id() == null) {
            entity = OutboxEventMapper.toEntity(event);
        } else {
            entity = outboxEventJpaRepository.findById(event.id()).orElseGet(OutboxEventEntity::new);
            OutboxEventMapper.merge(entity, event);
        }
        return OutboxEventMapper.toDomain(outboxEventJpaRepository.save(entity));
    }

    @Override
    public Optional<OutboxEvent> findById(Long id) {
        return outboxEventJpaRepository.findById(id).map(OutboxEventMapper::toDomain);
    }

    @Override
    public List<OutboxEvent> findByFilters(OutboxEventStatus status, OutboxEventType eventType) {
        return outboxEventJpaRepository.findByFilters(status, eventType)
                .stream()
                .map(OutboxEventMapper::toDomain)
                .toList();
    }
}

