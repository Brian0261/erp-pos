package com.erppos.backend.erp.sales.domain.port;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Durable metadata only; content is a versioned, minimal application command, never a credential. */
public interface SaleOperationRecoveryPort {
    record Operation(UUID actorId, UUID operationId, int protocolVersion, String origin, String state,
                     String requestHash, String intentHash, Long cashSessionId, Long saleId, Long quoteId,
                     String commandSnapshot, String quoteSnapshot, String receiptIntent, Long documentId,
                     String documentStatus, Instant createdAt, Instant updatedAt) {}
    Optional<Operation> findOwned(UUID actorId, UUID operationId);
    List<Operation> listOwned(UUID actorId, String state, boolean attention, int offset, int size);
    long countOwned(UUID actorId, String state, boolean attention);
    void prepare(Operation operation);
    void cancel(UUID actorId, UUID operationId);
}
