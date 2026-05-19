package com.erppos.backend.erp.admin.cleanup.application.usecase;

public interface ProductCleanupPreviewUseCase {

    ProductCleanupPreviewResult preview(ProductCleanupPreviewCommand command);
}
