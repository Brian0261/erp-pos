package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.sales.application.usecase.SalesListItemResult;
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
    public static SalesListItemResponse from(SalesListItemResult item) {
        var document = item.billingSummary();
        return new SalesListItemResponse(item.id(), item.saleNumber(), item.soldAt(), item.status(),
                item.totalAmount(), item.createdBy(), item.cashRegisterSessionId(),
                new BillingSummaryResponse(document.hasElectronicDocument(), document.documentId(),
                        document.documentType(), document.fullNumber(), document.status(), document.environment()));
    }
}
