package com.erppos.backend.erp.sales.domain.model;

public record SaleBillingSummary(
        boolean hasElectronicDocument,
        Long documentId,
        String documentType,
        String fullNumber,
        String status,
        String environment
) {
    public static SaleBillingSummary empty() {
        return new SaleBillingSummary(false, null, null, null, null, null);
    }
}
