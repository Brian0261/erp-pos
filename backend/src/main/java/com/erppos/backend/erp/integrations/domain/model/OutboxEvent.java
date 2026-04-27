package com.erppos.backend.erp.integrations.domain.model;

import java.time.Instant;

public record OutboxEvent(
        Long id,
        OutboxEventType eventType,
        String aggregateType,
        String aggregateId,
        String payloadJson,
        OutboxEventStatus status,
        int retryCount,
        String lastError,
        Instant createdAt,
        Instant publishedAt
) {
}

