package com.erppos.backend.erp.integrations.adapter.dto;

import com.erppos.backend.erp.integrations.domain.model.OutboxEventStatus;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;

import java.time.Instant;

public record OutboxEventResponse(
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

