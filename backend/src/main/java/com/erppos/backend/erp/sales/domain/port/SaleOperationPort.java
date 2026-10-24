package com.erppos.backend.erp.sales.domain.port;

import java.util.Optional;
import java.util.UUID;

public interface SaleOperationPort {
    void lock(UUID actorId, UUID operationId);
    Optional<CompletedOperation> find(UUID actorId, UUID operationId);
    void complete(UUID actorId, UUID operationId, String requestHash, Long saleId);
    Long preparedCashSession(UUID actorId, UUID operationId, String requestHash);
    void lockForSale(Long saleId);
    record CompletedOperation(String requestHash, Long saleId) {}
}
