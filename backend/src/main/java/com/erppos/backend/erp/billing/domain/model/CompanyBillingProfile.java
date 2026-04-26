package com.erppos.backend.erp.billing.domain.model;

import java.time.Instant;

public record CompanyBillingProfile(
        Long id,
        String ruc,
        String legalName,
        String fiscalAddress,
        BillingEnvironment environment,
        String certificatePath,
        String certificatePassword,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}

