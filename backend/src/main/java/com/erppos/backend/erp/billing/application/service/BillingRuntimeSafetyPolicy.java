package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import com.erppos.backend.erp.billing.domain.port.FiscalSecretResolverPort;
import com.erppos.backend.erp.billing.domain.port.XmlSignerPort;
import org.springframework.stereotype.Service;

@Service
public class BillingRuntimeSafetyPolicy {

    public static final String PRODUCTION_NOT_CONFIGURED_MESSAGE =
            "Emision electronica productiva no configurada. Configure proveedor fiscal real antes de emitir en PROD.";

    private final ElectronicBillingProviderPort billingProviderPort;
    private final XmlSignerPort xmlSignerPort;
    private final FiscalSecretResolverPort fiscalSecretResolverPort;

    public BillingRuntimeSafetyPolicy(
            ElectronicBillingProviderPort billingProviderPort,
            XmlSignerPort xmlSignerPort,
            FiscalSecretResolverPort fiscalSecretResolverPort
    ) {
        this.billingProviderPort = billingProviderPort;
        this.xmlSignerPort = xmlSignerPort;
        this.fiscalSecretResolverPort = fiscalSecretResolverPort;
    }

    public boolean allowsSimulation(BillingEnvironment environment) {
        return environment == BillingEnvironment.LOCAL || environment == BillingEnvironment.BETA;
    }

    public boolean allowsMockProvider(BillingEnvironment environment) {
        return allowsSimulation(environment);
    }

    public boolean allowsNoopSigner(BillingEnvironment environment) {
        return allowsSimulation(environment);
    }

    public boolean isProductionReady() {
        return billingProviderPort.supportsProduction()
                && xmlSignerPort.supportsProduction()
                && fiscalSecretResolverPort.supportsProduction();
    }

    public void assertCanCreateFromSale(BillingEnvironment environment) {
        assertProductionReady(environment);
    }

    public void assertCanSign(BillingEnvironment environment) {
        if (environment == BillingEnvironment.PROD && !xmlSignerPort.supportsProduction()) {
            throw new BillingConflictException(PRODUCTION_NOT_CONFIGURED_MESSAGE);
        }
    }

    public void assertCanSend(BillingEnvironment environment) {
        assertProductionReady(environment);
    }

    public void assertCanAcceptProviderResult(BillingEnvironment environment, ElectronicDocumentStatus status) {
        if (environment == BillingEnvironment.PROD
                && status == ElectronicDocumentStatus.ACCEPTED
                && !billingProviderPort.supportsProduction()) {
            throw new BillingConflictException(PRODUCTION_NOT_CONFIGURED_MESSAGE);
        }
    }

    private void assertProductionReady(BillingEnvironment environment) {
        if (environment == BillingEnvironment.PROD && !isProductionReady()) {
            throw new BillingConflictException(PRODUCTION_NOT_CONFIGURED_MESSAGE);
        }
    }
}
