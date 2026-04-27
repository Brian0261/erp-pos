package com.erppos.backend.erp.integrations.application.usecase;

import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventStatus;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;

import java.util.List;

public interface OutboxEventUseCase {
    OutboxEvent create(CreateOutboxEventCommand command);
    List<OutboxEvent> list(OutboxEventStatus status, OutboxEventType eventType);
    OutboxEvent getById(Long id);
    OutboxEvent markPublished(Long id);
    OutboxEvent retry(Long id);
}

