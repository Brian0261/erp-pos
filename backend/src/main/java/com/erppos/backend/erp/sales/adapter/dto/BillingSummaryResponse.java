package com.erppos.backend.erp.sales.adapter.dto;

public record BillingSummaryResponse(
        boolean hasElectronicDocument,
        Long documentId,
        String documentType,
        String fullNumber,
        String status,
        String environment
) {
}
