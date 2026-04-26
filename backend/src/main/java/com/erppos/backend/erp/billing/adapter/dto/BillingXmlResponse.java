package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.domain.model.BillingXmlFileType;

import java.time.Instant;

public record BillingXmlResponse(
        Long id,
        BillingXmlFileType fileType,
        String fileName,
        String mimeType,
        String content,
        Instant createdAt
) {
}

