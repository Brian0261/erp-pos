package com.erppos.backend.erp.reports.adapter.dto;

public record DocumentTypeCountResponse(
        String documentType,
        long count
) {
}

