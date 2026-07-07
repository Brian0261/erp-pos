package com.erppos.backend.erp.billing.domain.model;

import java.time.Instant;

public record ElectronicDocumentAttempt(
        Long id,
        Long electronicDocumentId,
        FiscalOperation operation,
        int attemptNumber,
        FiscalAttemptResult result,
        FiscalErrorCategory errorCategory,
        boolean recoverable,
        String providerStatus,
        String providerCode,
        String providerMessage,
        String providerTicket,
        String providerCorrelationId,
        String requestHash,
        String responseHash,
        Instant startedAt,
        Instant finishedAt,
        String actor,
        String traceId,
        boolean simulated
) {
}
