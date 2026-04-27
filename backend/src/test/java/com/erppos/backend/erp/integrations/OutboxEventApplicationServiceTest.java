package com.erppos.backend.erp.integrations;

import com.erppos.backend.erp.integrations.adapter.rest.OutboxEventController;
import com.erppos.backend.erp.integrations.application.service.OutboxEventApplicationService;
import com.erppos.backend.erp.integrations.application.usecase.CreateOutboxEventCommand;
import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventStatus;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;
import com.erppos.backend.erp.integrations.domain.port.OutboxEventRepositoryPort;
import com.erppos.backend.erp.integrations.domain.port.OutboxPublisherPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class OutboxEventApplicationServiceTest {

    private InMemoryOutboxRepository repository;
    private OutboxEventApplicationService service;

    @BeforeEach
    void setUp() {
        repository = new InMemoryOutboxRepository();
        service = new OutboxEventApplicationService(repository, new StubPublisher());
    }

    @Test
    void shouldCreateOutboxEvent() {
        OutboxEvent created = service.create(new CreateOutboxEventCommand(
                OutboxEventType.SALE_COMPLETED,
                "SALE",
                "10",
                "{\"saleId\":10}"
        ));
        assertNotNull(created.id());
        assertEquals(OutboxEventStatus.PENDING, created.status());
    }

    @Test
    void shouldListPendingEvents() {
        service.create(new CreateOutboxEventCommand(OutboxEventType.SALE_COMPLETED, "SALE", "1", "{}"));
        List<OutboxEvent> events = service.list(OutboxEventStatus.PENDING, null);
        assertEquals(1, events.size());
    }

    @Test
    void shouldMarkEventPublished() {
        OutboxEvent created = service.create(new CreateOutboxEventCommand(OutboxEventType.PRODUCT_CREATED, "PRODUCT", "1", "{}"));
        OutboxEvent published = service.markPublished(created.id());
        assertEquals(OutboxEventStatus.PUBLISHED, published.status());
    }

    @Test
    void shouldRetryFailedEvent() {
        OutboxEvent created = service.create(new CreateOutboxEventCommand(OutboxEventType.SALE_COMPLETED, "SALE", "1", "FAIL"));
        OutboxEvent retried = service.retry(created.id());
        assertEquals(OutboxEventStatus.FAILED, retried.status());
        assertEquals(1, retried.retryCount());
    }

    @Test
    void shouldConfigureControllerToForbidCajeroOnOutboxMutation() throws NoSuchMethodException {
        Method method = OutboxEventController.class.getMethod("markPublished", Long.class);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize);
        assertTrue(preAuthorize.value().contains("ADMIN"));
        assertFalse(preAuthorize.value().contains("CAJERO"));
    }

    static class InMemoryOutboxRepository implements OutboxEventRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, OutboxEvent> storage = new HashMap<>();

        @Override
        public OutboxEvent save(OutboxEvent event) {
            Long id = event.id() == null ? seq.getAndIncrement() : event.id();
            OutboxEvent stored = new OutboxEvent(
                    id,
                    event.eventType(),
                    event.aggregateType(),
                    event.aggregateId(),
                    event.payloadJson(),
                    event.status(),
                    event.retryCount(),
                    event.lastError(),
                    event.createdAt() == null ? Instant.now() : event.createdAt(),
                    event.publishedAt()
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<OutboxEvent> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public List<OutboxEvent> findByFilters(OutboxEventStatus status, OutboxEventType eventType) {
            return storage.values().stream()
                    .filter(e -> status == null || e.status() == status)
                    .filter(e -> eventType == null || e.eventType() == eventType)
                    .toList();
        }
    }

    static class StubPublisher implements OutboxPublisherPort {
        @Override
        public PublishResult publish(OutboxEvent event) {
            if (event.payloadJson().contains("FAIL")) {
                return new PublishResult(false, "simulated fail");
            }
            return new PublishResult(true, null);
        }
    }
}

