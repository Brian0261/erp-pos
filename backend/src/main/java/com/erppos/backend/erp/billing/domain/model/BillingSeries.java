package com.erppos.backend.erp.billing.domain.model;

import java.time.Instant;

public record BillingSeries(
        Long id,
        Long version,
        ElectronicDocumentType documentType,
        String series,
        long currentNumber,
        BillingEnvironment environment,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}

