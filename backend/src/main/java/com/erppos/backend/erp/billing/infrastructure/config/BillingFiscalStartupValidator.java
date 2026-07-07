package com.erppos.backend.erp.billing.infrastructure.config;

import com.erppos.backend.erp.billing.application.service.BillingRuntimeSafetyPolicy;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import com.erppos.backend.erp.billing.domain.port.FiscalSecretResolverPort;
import com.erppos.backend.erp.billing.domain.port.XmlSignerPort;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class BillingFiscalStartupValidator {

    private static final String STARTUP_FAILURE_MESSAGE =
            "Configuracion fiscal productiva incompleta: desactive billing.secrets.production-enabled o configure provider, signer y resolver productivos.";

    private final BillingFiscalProperties properties;
    private final ElectronicBillingProviderPort billingProviderPort;
    private final XmlSignerPort xmlSignerPort;
    private final FiscalSecretResolverPort fiscalSecretResolverPort;

    public BillingFiscalStartupValidator(
            BillingFiscalProperties properties,
            ElectronicBillingProviderPort billingProviderPort,
            XmlSignerPort xmlSignerPort,
            FiscalSecretResolverPort fiscalSecretResolverPort
    ) {
        this.properties = properties;
        this.billingProviderPort = billingProviderPort;
        this.xmlSignerPort = xmlSignerPort;
        this.fiscalSecretResolverPort = fiscalSecretResolverPort;
    }

    @PostConstruct
    public void validate() {
        if (!properties.getSecrets().isProductionEnabled()) {
            return;
        }
        if (!isProductionCapable(properties.getSecrets().getProvider())
                || !isProductionCapable(properties.getElectronic().getProvider())
                || !isProductionCapable(properties.getSigner().getProvider())
                || !billingProviderPort.supportsProduction()
                || !xmlSignerPort.supportsProduction()
                || !fiscalSecretResolverPort.supportsProduction()) {
            throw new IllegalStateException(STARTUP_FAILURE_MESSAGE + " " + BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE);
        }
    }

    private boolean isProductionCapable(BillingFiscalProperties.SecretProvider provider) {
        return provider != null && provider.isProductionCapable();
    }

    private boolean isProductionCapable(BillingFiscalProperties.ElectronicProvider provider) {
        return provider != null && provider.isProductionCapable();
    }

    private boolean isProductionCapable(BillingFiscalProperties.SignerProvider provider) {
        return provider != null && provider.isProductionCapable();
    }
}
