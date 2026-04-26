package com.erppos.backend.erp.quotes.domain.model;

import java.time.Instant;

public record QuoteStatusHistory(
        Long id,
        Long quoteId,
        QuoteStatus previousStatus,
        QuoteStatus newStatus,
        String comment,
        Instant changedAt,
        String changedBy
) {
}

