package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;

public interface XmlSignerPort {
    String signXml(String xml, CompanyBillingProfile profile);
}

