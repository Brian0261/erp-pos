package com.erppos.backend.erp.billing.infrastructure.signature;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.domain.port.XmlSignerPort;
import org.springframework.stereotype.Component;

@Component
public class EnvironmentAwareXmlSignerAdapter implements XmlSignerPort {

    private final NoopXmlSignerAdapter noopXmlSignerAdapter;
    private final PfxXmlSignerAdapter pfxXmlSignerAdapter;

    public EnvironmentAwareXmlSignerAdapter(NoopXmlSignerAdapter noopXmlSignerAdapter, PfxXmlSignerAdapter pfxXmlSignerAdapter) {
        this.noopXmlSignerAdapter = noopXmlSignerAdapter;
        this.pfxXmlSignerAdapter = pfxXmlSignerAdapter;
    }

    @Override
    public String signXml(String xml, CompanyBillingProfile profile) {
        if (profile.environment() == BillingEnvironment.PROD) {
            return pfxXmlSignerAdapter.sign(xml, profile);
        }
        return noopXmlSignerAdapter.sign(xml);
    }
}

