package com.erppos.backend.erp.quotes.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record Quote(
        Long id,
        String quoteNumber,
        String customerName,
        String customerDocument,
        String customerPhone,
        String customerEmail,
        QuoteStatus status,
        LocalDate issueDate,
        LocalDate expiresAt,
        Instant sentAt,
        Long convertedSaleId,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String notes,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy,
        List<QuoteItem> items
) {
}

