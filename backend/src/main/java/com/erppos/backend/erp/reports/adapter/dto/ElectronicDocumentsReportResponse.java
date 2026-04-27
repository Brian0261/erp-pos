package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;
import java.util.List;

public record ElectronicDocumentsReportResponse(
        long totalDocuments,
        long acceptedCount,
        long rejectedCount,
        long errorCount,
        BigDecimal totalAmount,
        List<DocumentTypeCountResponse> documentsByType
) {
}

