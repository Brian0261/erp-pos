package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

import java.time.Instant;

public record BillingSeriesResponse(
        Long id,
        long version,
        ElectronicDocumentType documentType,
        String series,
        long currentNumber,
        BillingEnvironment environment,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}

