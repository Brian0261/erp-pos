package com.erppos.backend.erp.billing.domain.model;

import java.time.Instant;

public record CompanyBillingProfile(
        Long id,
        String ruc,
        String legalName,
        String fiscalAddress,
        BillingEnvironment environment,
        String certificatePath,
        String certificateSecretRef,
        String certificatePasswordSecretRef,
        String providerSecretRef,
        String certificateAlias,
        String secretProvider,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}

