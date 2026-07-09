package com.erppos.backend.erp.billing.infrastructure.provider;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import org.springframework.stereotype.Component;

@Component
public class MockElectronicBillingProviderAdapter implements ElectronicBillingProviderPort {

    @Override
    public boolean supportsProduction() {
        return false;
    }

    @Override
    public ProviderSendResult send(ElectronicDocument document, String signedXml) {
        if (document.environment() == BillingEnvironment.PROD) {
            return ProviderSendResult.configurationError("MOCK-BLOCKED-" + document.id(), "Provider mock bloqueado en ambiente PROD.");
        }
        if (document.customerName() != null && document.customerName().toUpperCase().contains("REJECT")) {
            return ProviderSendResult.rejected("MOCK-REJ-" + document.id(), "Respuesta simulada de sandbox: rechazado.");
        }
        return ProviderSendResult.accepted("MOCK-ACC-" + document.id(), "Respuesta simulada de sandbox: aceptado.");
    }
}

