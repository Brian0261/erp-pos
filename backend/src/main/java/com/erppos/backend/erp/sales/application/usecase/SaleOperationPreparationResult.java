package com.erppos.backend.erp.sales.application.usecase;

import java.util.UUID;

/** A rejected outcome is observable by REST only after the preparation transaction commits successfully. */
public sealed interface SaleOperationPreparationResult {
    record Durable(SaleOperationResult operation) implements SaleOperationPreparationResult {}
    record Rejected(UUID operationId, UUID actorUserId, String origin, String reasonCode)
            implements SaleOperationPreparationResult {}
}
