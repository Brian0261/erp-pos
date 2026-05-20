package com.erppos.backend.erp.admin.cleanup.adapter.rest;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ProductCleanupExecuteRequest(
        List<Long> productIds,
        List<String> skus,
        @NotBlank String confirmationText
) {
}
