package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;

import java.util.List;

public interface UblXmlGeneratorPort {
    String generate(ElectronicDocument document, CompanyBillingProfile profile, List<ElectronicDocumentItem> items);
}

