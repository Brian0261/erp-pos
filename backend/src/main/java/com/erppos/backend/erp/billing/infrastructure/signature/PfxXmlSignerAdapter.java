package com.erppos.backend.erp.billing.infrastructure.signature;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import org.springframework.stereotype.Component;

@Component
public class PfxXmlSignerAdapter {

    public boolean supportsProduction() {
        return false;
    }

    public String sign(String xml, CompanyBillingProfile profile) {
        throw new BillingBusinessRuleException("Firma XML productiva no configurada.");
    }
}

