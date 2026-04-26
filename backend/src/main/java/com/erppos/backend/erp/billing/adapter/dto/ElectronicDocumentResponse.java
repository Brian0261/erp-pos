package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ElectronicDocumentResponse(
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
        List<ElectronicDocumentItemResponse> items
) {
}

