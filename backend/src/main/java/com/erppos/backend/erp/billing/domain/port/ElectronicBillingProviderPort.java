package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;

public interface ElectronicBillingProviderPort {
    ProviderSendResult send(ElectronicDocument document, String signedXml);

    default boolean supportsProduction() {
        return false;
    }
}

