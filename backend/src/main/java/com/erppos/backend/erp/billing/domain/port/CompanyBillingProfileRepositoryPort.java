package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;

import java.util.Optional;

public interface CompanyBillingProfileRepositoryPort {
    CompanyBillingProfile save(CompanyBillingProfile profile);
    Optional<CompanyBillingProfile> findActiveByEnvironment(BillingEnvironment environment);
}

