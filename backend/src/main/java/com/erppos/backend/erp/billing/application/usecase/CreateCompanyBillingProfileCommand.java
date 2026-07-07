package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;

public record CreateCompanyBillingProfileCommand(
        String ruc,
        String legalName,
        String fiscalAddress,
        BillingEnvironment environment,
        String certificatePath,
        String certificatePassword,
        String certificateSecretRef,
        String certificatePasswordSecretRef,
        String providerSecretRef,
        String certificateAlias,
        String secretProvider
) {
    public CreateCompanyBillingProfileCommand(
            String ruc,
            String legalName,
            String fiscalAddress,
            BillingEnvironment environment,
            String certificatePath,
            String certificatePassword
    ) {
        this(ruc, legalName, fiscalAddress, environment, certificatePath, certificatePassword, null, null, null, null, null);
    }
}

