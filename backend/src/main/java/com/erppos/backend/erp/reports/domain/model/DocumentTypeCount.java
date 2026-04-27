package com.erppos.backend.erp.reports.domain.model;

public record DocumentTypeCount(
        String documentType,
        long count
) {
}

