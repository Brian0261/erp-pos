package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.sales.domain.model.SaleStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record SalesListItemResponse(
        Long id,
        String saleNumber,
        Instant soldAt,
        SaleStatus status,
        BigDecimal totalAmount,
        String createdBy,
        Long cashRegisterSessionId,
        BillingSummaryResponse billingSummary
) {
}
