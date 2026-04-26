package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;

public record UpdateCompanyBillingProfileCommand(
        String ruc,
        String legalName,
        String fiscalAddress,
        BillingEnvironment environment,
        String certificatePath,
        String certificatePassword,
        Boolean active
) {
}

