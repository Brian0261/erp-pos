package com.erppos.backend.erp.sales.application.usecase;

import com.erppos.backend.erp.sales.domain.model.SaleStatus;

import java.time.LocalDate;

public record SalesListQuery(
        int page, int size, String saleNumber, String saleNumberPrefix,
        LocalDate from, LocalDate to, SaleStatus status, Long cashRegisterSessionId, String createdBy,
        Boolean hasElectronicDocument, String documentStatus
) {
    public long offset() {
        return (long) page * size;
    }

    public boolean filtersByDocument() {
        return hasElectronicDocument != null || documentStatus != null;
    }
}
