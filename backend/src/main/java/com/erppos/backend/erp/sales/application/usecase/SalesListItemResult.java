package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.sales.domain.model.SaleBillingSummary;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record SalesListItemResult(
        Long id,
        String saleNumber,
        Instant soldAt,
        SaleStatus status,
        BigDecimal totalAmount,
        String createdBy,
        Long cashRegisterSessionId,
        SaleBillingSummary billingSummary
) {
}
