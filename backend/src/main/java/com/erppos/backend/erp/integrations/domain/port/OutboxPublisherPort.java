package com.erppos.backend.erp.integrations.domain.port;

import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;

public interface OutboxPublisherPort {
    PublishResult publish(OutboxEvent event);

    record PublishResult(boolean success, String error) {
    }
}

