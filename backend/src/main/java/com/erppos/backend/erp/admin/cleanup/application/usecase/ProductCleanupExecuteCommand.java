package com.erppos.backend.erp.admin.cleanup.application.usecase;

import java.util.List;

public record ProductCleanupExecuteCommand(
        List<Long> productIds,
        List<String> skus,
        String confirmationText
) {
}
