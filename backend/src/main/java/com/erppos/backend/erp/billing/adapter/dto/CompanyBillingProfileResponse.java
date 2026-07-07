package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;

import java.time.Instant;

public record CompanyBillingProfileResponse(
        Long id,
        String ruc,
        String legalName,
        String fiscalAddress,
        BillingEnvironment environment,
        boolean certificateConfigured,
        boolean providerConfigured,
        String certificateAlias,
        String secretProvider,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}

