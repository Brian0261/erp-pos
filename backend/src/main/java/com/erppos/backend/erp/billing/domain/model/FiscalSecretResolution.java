package com.erppos.backend.erp.billing.domain.model;

public record FiscalSecretResolution(
        FiscalSecretType type,
        BillingEnvironment environment,
        boolean placeholder
) {
    @Override
    public String toString() {
        return "FiscalSecretResolution[type=" + type + ", environment=" + environment + ", placeholder=" + placeholder + "]";
    }
}
