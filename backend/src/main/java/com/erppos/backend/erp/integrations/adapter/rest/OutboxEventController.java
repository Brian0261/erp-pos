package com.erppos.backend.erp.integrations.adapter.rest;

import com.erppos.backend.erp.integrations.adapter.dto.OutboxEventResponse;
import com.erppos.backend.erp.integrations.application.usecase.OutboxEventUseCase;
import com.erppos.backend.erp.integrations.domain.model.OutboxEvent;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventStatus;
import com.erppos.backend.erp.integrations.domain.model.OutboxEventType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/integrations/outbox-events")
public class OutboxEventController {

    private final OutboxEventUseCase outboxEventUseCase;

    public OutboxEventController(OutboxEventUseCase outboxEventUseCase) {
        this.outboxEventUseCase = outboxEventUseCase;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<List<OutboxEventResponse>> list(
            @RequestParam(required = false) OutboxEventStatus status,
            @RequestParam(required = false) OutboxEventType eventType
    ) {
        return ResponseEntity.ok(outboxEventUseCase.list(status, eventType).stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ResponseEntity<OutboxEventResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(outboxEventUseCase.getById(id)));
    }

    @PostMapping("/{id}/mark-published")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OutboxEventResponse> markPublished(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(outboxEventUseCase.markPublished(id)));
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OutboxEventResponse> retry(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(outboxEventUseCase.retry(id)));
    }

    private OutboxEventResponse toResponse(OutboxEvent event) {
        return new OutboxEventResponse(
                event.id(),
                event.eventType(),
                event.aggregateType(),
                event.aggregateId(),
                event.payloadJson(),
                event.status(),
                event.retryCount(),
                event.lastError(),
                event.createdAt(),
                event.publishedAt()
        );
    }
}

