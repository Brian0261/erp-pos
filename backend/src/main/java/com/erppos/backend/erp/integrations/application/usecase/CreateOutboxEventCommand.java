package com.erppos.backend.erp.integrations.application.usecase;

import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;

public record CreateOutboxEventCommand(
        OutboxEventType eventType,
        String aggregateType,
        String aggregateId,
        String payloadJson
) {
}

