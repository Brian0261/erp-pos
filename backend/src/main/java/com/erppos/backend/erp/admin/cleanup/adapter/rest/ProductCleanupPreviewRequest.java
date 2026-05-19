package com.erppos.backend.erp.admin.cleanup.adapter.rest;

import java.util.List;

public record ProductCleanupPreviewRequest(
        List<Long> productIds,
        List<String> skus
) {
}
