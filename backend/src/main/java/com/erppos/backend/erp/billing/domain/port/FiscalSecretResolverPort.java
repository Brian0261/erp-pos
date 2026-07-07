package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.FiscalSecretResolution;

public interface FiscalSecretResolverPort {
    FiscalSecretResolution resolveCertificate(String certificateRef, BillingEnvironment environment);

    FiscalSecretResolution resolveCertificatePassword(String certificatePasswordRef, BillingEnvironment environment);

    FiscalSecretResolution resolveProviderCredentials(String providerRef, BillingEnvironment environment);

    default boolean supportsProduction() {
        return false;
    }
}
