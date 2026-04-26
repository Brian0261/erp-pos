package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;

import java.time.Instant;

public record ElectronicDocumentHistoryResponse(
        Long id,
        ElectronicDocumentStatus previousStatus,
        ElectronicDocumentStatus newStatus,
        String message,
        Instant changedAt,
        String changedBy
) {
}

