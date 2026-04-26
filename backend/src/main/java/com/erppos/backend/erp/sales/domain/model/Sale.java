package com.erppos.backend.erp.sales.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Sale(
        Long id,
        Long cashRegisterSessionId,
        Long warehouseId,
        String saleNumber,
        SaleStatus status,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal changeAmount,
        Instant soldAt,
        Instant voidedAt,
        UUID voidedByUserId,
        String voidReason,
        String createdBy,
        Instant createdAt,
        Instant updatedAt,
        List<SaleItem> items,
        List<SalePayment> payments
) {
}

