package com.erppos.backend.erp.quotes.adapter.dto;

import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;

import java.time.Instant;

public record QuoteHistoryResponse(
        Long id,
        QuoteStatus previousStatus,
        QuoteStatus newStatus,
        String comment,
        Instant changedAt,
        String changedBy
) {
}

