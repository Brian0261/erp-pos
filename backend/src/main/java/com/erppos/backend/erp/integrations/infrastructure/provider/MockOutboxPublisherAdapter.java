package com.erppos.backend.erp.integrations.infrastructure.provider;

import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;
import com.erppos.backend.erp.integrations.domain.port.OutboxPublisherPort;
import org.springframework.stereotype.Component;

@Component
public class MockOutboxPublisherAdapter implements OutboxPublisherPort {

    @Override
    public PublishResult publish(OutboxEvent event) {
        if (event.payloadJson().toUpperCase().contains("FAIL")) {
            return new PublishResult(false, "Mock publisher simulated failure");
        }
        return new PublishResult(true, null);
    }
}

