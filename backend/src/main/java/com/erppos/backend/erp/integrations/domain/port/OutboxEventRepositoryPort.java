package com.erppos.backend.erp.integrations.domain.port;

import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventStatus;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;

import java.util.List;
import java.util.Optional;

public interface OutboxEventRepositoryPort {
    OutboxEvent save(OutboxEvent event);
    Optional<OutboxEvent> findById(Long id);
    List<OutboxEvent> findByFilters(OutboxEventStatus status, OutboxEventType eventType);
}

