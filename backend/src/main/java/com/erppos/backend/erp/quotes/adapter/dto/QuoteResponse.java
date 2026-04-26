package com.erppos.backend.erp.quotes.adapter.dto;

import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record QuoteResponse(
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
        String createdBy,
        List<QuoteItemResponse> items
) {
}

