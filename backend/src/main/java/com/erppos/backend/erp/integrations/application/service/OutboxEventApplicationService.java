package com.erppos.backend.erp.integrations.application.service;

import com.erppos.backend.erp.integrations.application.usecase.CreateOutboxEventCommand;
import com.erppos.backend.erp.integrations.application.usecase.OutboxEventUseCase;
import com.erppos.backend.erp.integrations.domain.exception.IntegrationBusinessRuleException;
import com.erppos.backend.erp.integrations.domain.exception.IntegrationNotFoundException;
import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventStatus;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;
import com.erppos.backend.erp.integrations.domain.port.OutboxEventRepositoryPort;
import com.erppos.backend.erp.integrations.domain.port.OutboxPublisherPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class OutboxEventApplicationService implements OutboxEventUseCase {

    private final OutboxEventRepositoryPort outboxEventRepositoryPort;
    private final OutboxPublisherPort outboxPublisherPort;

    public OutboxEventApplicationService(
            OutboxEventRepositoryPort outboxEventRepositoryPort,
            OutboxPublisherPort outboxPublisherPort
    ) {
        this.outboxEventRepositoryPort = outboxEventRepositoryPort;
        this.outboxPublisherPort = outboxPublisherPort;
    }

    @Override
    @Transactional
    public OutboxEvent create(CreateOutboxEventCommand command) {
        validate(command);
        return outboxEventRepositoryPort.save(new OutboxEvent(
                null,
                command.eventType(),
                command.aggregateType().trim(),
                command.aggregateId().trim(),
                command.payloadJson().trim(),
                OutboxEventStatus.PENDING,
                0,
                null,
                null,
                null
        ));
    }

    @Override
    public List<OutboxEvent> list(OutboxEventStatus status, OutboxEventType eventType) {
        return outboxEventRepositoryPort.findByFilters(status, eventType);
    }

    @Override
    public OutboxEvent getById(Long id) {
        return outboxEventRepositoryPort.findById(id)
                .orElseThrow(() -> new IntegrationNotFoundException("Outbox event not found"));
    }

    @Override
    @Transactional
    public OutboxEvent markPublished(Long id) {
        OutboxEvent current = getById(id);
        if (current.status() == OutboxEventStatus.PUBLISHED) {
            return current;
        }
        return outboxEventRepositoryPort.save(new OutboxEvent(
                current.id(),
                current.eventType(),
                current.aggregateType(),
                current.aggregateId(),
                current.payloadJson(),
                OutboxEventStatus.PUBLISHED,
                current.retryCount(),
                null,
                current.createdAt(),
                Instant.now()
        ));
    }

    @Override
    @Transactional
    public OutboxEvent retry(Long id) {
        OutboxEvent current = getById(id);
        if (current.status() != OutboxEventStatus.FAILED && current.status() != OutboxEventStatus.PENDING) {
            throw new IntegrationBusinessRuleException("Only FAILED or PENDING events can be retried");
        }

        OutboxPublisherPort.PublishResult result = outboxPublisherPort.publish(current);
        OutboxEventStatus nextStatus = result.success() ? OutboxEventStatus.PUBLISHED : OutboxEventStatus.FAILED;
        String lastError = result.success() ? null : result.error();

        return outboxEventRepositoryPort.save(new OutboxEvent(
                current.id(),
                current.eventType(),
                current.aggregateType(),
                current.aggregateId(),
                current.payloadJson(),
                nextStatus,
                current.retryCount() + 1,
                lastError,
                current.createdAt(),
                result.success() ? Instant.now() : current.publishedAt()
        ));
    }

    private void validate(CreateOutboxEventCommand command) {
        if (command.eventType() == null) {
            throw new IntegrationBusinessRuleException("eventType is required");
        }
        if (command.aggregateType() == null || command.aggregateType().trim().isEmpty()) {
            throw new IntegrationBusinessRuleException("aggregateType is required");
        }
        if (command.aggregateId() == null || command.aggregateId().trim().isEmpty()) {
            throw new IntegrationBusinessRuleException("aggregateId is required");
        }
        if (command.payloadJson() == null || command.payloadJson().trim().isEmpty()) {
            throw new IntegrationBusinessRuleException("payloadJson is required");
        }
    }
}

