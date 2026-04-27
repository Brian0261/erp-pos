package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;
import java.util.List;

public record ElectronicDocumentsReport(
        long totalDocuments,
        long acceptedCount,
        long rejectedCount,
        long errorCount,
        BigDecimal totalAmount,
        List<DocumentTypeCount> documentsByType
) {
}

