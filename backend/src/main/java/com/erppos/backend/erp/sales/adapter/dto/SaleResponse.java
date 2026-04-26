package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.sales.domain.model.SaleStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SaleResponse(
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
        List<SaleItemResponse> items,
        List<SalePaymentResponse> payments
) {
}

