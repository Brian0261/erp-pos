package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFileType;

import java.util.Optional;

public interface BillingXmlFileRepositoryPort {
    BillingXmlFile save(BillingXmlFile xmlFile);
    Optional<BillingXmlFile> findByElectronicDocumentIdAndFileType(Long electronicDocumentId, BillingXmlFileType fileType);
}

