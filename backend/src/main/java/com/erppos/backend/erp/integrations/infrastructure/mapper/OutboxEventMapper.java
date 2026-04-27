package com.erppos.backend.erp.integrations.infrastructure.mapper;

import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;
import com.erppos.backend.erp.integrations.infrastructure.persistence.OutboxEventEntity;

public final class OutboxEventMapper {
    private OutboxEventMapper() {
    }

    public static OutboxEvent toDomain(OutboxEventEntity entity) {
        return new OutboxEvent(
                entity.getId(),
                entity.getEventType(),
                entity.getAggregateType(),
                entity.getAggregateId(),
                entity.getPayloadJson(),
                entity.getStatus(),
                entity.getRetryCount(),
                entity.getLastError(),
                entity.getCreatedAt(),
                entity.getPublishedAt()
        );
    }

    public static OutboxEventEntity toEntity(OutboxEvent event) {
        OutboxEventEntity entity = new OutboxEventEntity();
        merge(entity, event);
        return entity;
    }

    public static void merge(OutboxEventEntity entity, OutboxEvent event) {
        entity.setEventType(event.eventType());
        entity.setAggregateType(event.aggregateType());
        entity.setAggregateId(event.aggregateId());
        entity.setPayloadJson(event.payloadJson());
        entity.setStatus(event.status());
        entity.setRetryCount(event.retryCount());
        entity.setLastError(event.lastError());
        entity.setCreatedAt(event.createdAt());
        entity.setPublishedAt(event.publishedAt());
    }
}

