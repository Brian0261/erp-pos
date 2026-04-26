package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;

public interface CompanyBillingProfileUseCase {
    CompanyBillingProfile create(CreateCompanyBillingProfileCommand command);
    CompanyBillingProfile get(BillingEnvironment environment);
    CompanyBillingProfile update(UpdateCompanyBillingProfileCommand command);
}

