package com.erppos.backend.erp.billing.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

public record ElectronicDocument(
        Long id,
        Long saleId,
        Long billingSeriesId,
        ElectronicDocumentType documentType,
        ElectronicDocumentStatus status,
        BillingEnvironment environment,
        String series,
        long number,
        String fullNumber,
        String customerName,
        String customerDocument,
        String currencyCode,
        BigDecimal subtotalAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        Instant xmlGeneratedAt,
        Instant signedAt,
        Instant sentAt,
        String providerTicket,
        String providerMessage,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}

