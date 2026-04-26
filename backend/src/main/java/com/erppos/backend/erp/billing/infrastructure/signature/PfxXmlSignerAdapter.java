package com.erppos.backend.erp.billing.infrastructure.signature;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import org.springframework.stereotype.Component;

@Component
public class PfxXmlSignerAdapter {

    public String sign(String xml, CompanyBillingProfile profile) {
        if (profile.certificatePath() == null || profile.certificatePassword() == null) {
            throw new BillingBusinessRuleException("PROD signing requires certificatePath and certificatePassword");
        }
        return xml + "\n<!-- SIGNATURE:PFX path=" + profile.certificatePath() + " -->";
    }
}

