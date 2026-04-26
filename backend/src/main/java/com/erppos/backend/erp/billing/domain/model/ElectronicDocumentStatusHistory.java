package com.erppos.backend.erp.billing.domain.model;

import java.time.Instant;

public record ElectronicDocumentStatusHistory(
        Long id,
        Long electronicDocumentId,
        ElectronicDocumentStatus previousStatus,
        ElectronicDocumentStatus newStatus,
        String message,
        Instant changedAt,
        String changedBy
) {
}

