package com.erppos.backend.erp.billing.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "billing")
public class BillingFiscalProperties {

    private final Secrets secrets = new Secrets();
    private final Electronic electronic = new Electronic();
    private final Signer signer = new Signer();

    public Secrets getSecrets() {
        return secrets;
    }

    public Electronic getElectronic() {
        return electronic;
    }

    public Signer getSigner() {
        return signer;
    }

    public static class Secrets {
        private SecretProvider provider = SecretProvider.LOCAL;
        private boolean productionEnabled;

        public SecretProvider getProvider() {
            return provider;
        }

        public void setProvider(SecretProvider provider) {
            this.provider = provider;
        }

        public boolean isProductionEnabled() {
            return productionEnabled;
        }

        public void setProductionEnabled(boolean productionEnabled) {
            this.productionEnabled = productionEnabled;
        }
    }

    public static class Electronic {
        private ElectronicProvider provider = ElectronicProvider.MOCK;

        public ElectronicProvider getProvider() {
            return provider;
        }

        public void setProvider(ElectronicProvider provider) {
            this.provider = provider;
        }
    }

    public static class Signer {
        private SignerProvider provider = SignerProvider.NOOP;

        public SignerProvider getProvider() {
            return provider;
        }

        public void setProvider(SignerProvider provider) {
            this.provider = provider;
        }
    }

    public enum SecretProvider {
        LOCAL(false),
        MOCK(false),
        EXTERNAL(true),
        SECRET_MANAGER(true);

        private final boolean productionCapable;

        SecretProvider(boolean productionCapable) {
            this.productionCapable = productionCapable;
        }

        public boolean isProductionCapable() {
            return productionCapable;
        }
    }

    public enum ElectronicProvider {
        MOCK(false),
        EXTERNAL(true);

        private final boolean productionCapable;

        ElectronicProvider(boolean productionCapable) {
            this.productionCapable = productionCapable;
        }

        public boolean isProductionCapable() {
            return productionCapable;
        }
    }

    public enum SignerProvider {
        NOOP(false),
        EXTERNAL(true);

        private final boolean productionCapable;

        SignerProvider(boolean productionCapable) {
            this.productionCapable = productionCapable;
        }

        public boolean isProductionCapable() {
            return productionCapable;
        }
    }
}
