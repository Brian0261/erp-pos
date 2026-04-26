package com.erppos.backend.erp.billing.domain.model;

import java.time.Instant;

public record BillingXmlFile(
        Long id,
        Long electronicDocumentId,
        BillingXmlFileType fileType,
        String fileName,
        String content,
        String mimeType,
        Instant createdAt,
        String createdBy
) {
}

