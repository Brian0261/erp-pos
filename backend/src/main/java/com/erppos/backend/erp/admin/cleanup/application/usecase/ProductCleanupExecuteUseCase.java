package com.erppos.backend.erp.admin.cleanup.application.usecase;

public interface ProductCleanupExecuteUseCase {

    ProductCleanupExecuteResult execute(ProductCleanupExecuteCommand command);
}
