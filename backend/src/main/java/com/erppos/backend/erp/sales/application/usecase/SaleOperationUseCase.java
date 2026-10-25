package com.erppos.backend.erp.sales.application.usecase;

import java.util.UUID;

public interface SaleOperationUseCase {
    SaleOperationPreparationResult prepare(PrepareSaleOperationCommand command);
    SaleOperationResult get(UUID operationId);
    SaleOperationPageResult list(int page, int size, String state, boolean attention);
    SaleOperationResult cancel(UUID operationId);
}
