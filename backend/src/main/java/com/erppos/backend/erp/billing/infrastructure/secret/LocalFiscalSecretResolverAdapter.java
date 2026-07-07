package com.erppos.backend.erp.billing.infrastructure.secret;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.FiscalSecretResolution;
import com.erppos.backend.erp.billing.domain.model.FiscalSecretType;
import com.erppos.backend.erp.billing.domain.port.FiscalSecretResolverPort;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class LocalFiscalSecretResolverAdapter implements FiscalSecretResolverPort {

    public static final String PRODUCTIVE_RESOLVER_NOT_CONFIGURED_MESSAGE = "Resolver de secretos productivo no configurado.";

    private static final int MAX_REF_LENGTH = 120;
    private static final Set<String> CERTIFICATE_EXTENSIONS = Set.of(".pfx", ".p12", ".pem", ".crt", ".cer", ".key", ".jks", ".keystore");
    private static final Map<BillingEnvironment, Map<FiscalSecretType, Set<String>>> ALLOWED_PLACEHOLDERS = Map.of(
            BillingEnvironment.LOCAL, Map.of(
                    FiscalSecretType.CERTIFICATE, Set.of("LOCAL_NOOP_CERT"),
                    FiscalSecretType.CERTIFICATE_PASSWORD, Set.of("LOCAL_NOOP_CERT_PASSWORD"),
                    FiscalSecretType.PROVIDER_CREDENTIALS, Set.of("LOCAL_NOOP_PROVIDER")
            ),
            BillingEnvironment.BETA, Map.of(
                    FiscalSecretType.CERTIFICATE, Set.of("BETA_SANDBOX_REF"),
                    FiscalSecretType.CERTIFICATE_PASSWORD, Set.of("BETA_SANDBOX_CERT_PASSWORD"),
                    FiscalSecretType.PROVIDER_CREDENTIALS, Set.of("BETA_SANDBOX_PROVIDER")
            )
    );

    @Override
    public FiscalSecretResolution resolveCertificate(String certificateRef, BillingEnvironment environment) {
        return resolve(certificateRef, environment, FiscalSecretType.CERTIFICATE);
    }

    @Override
    public FiscalSecretResolution resolveCertificatePassword(String certificatePasswordRef, BillingEnvironment environment) {
        return resolve(certificatePasswordRef, environment, FiscalSecretType.CERTIFICATE_PASSWORD);
    }

    @Override
    public FiscalSecretResolution resolveProviderCredentials(String providerRef, BillingEnvironment environment) {
        return resolve(providerRef, environment, FiscalSecretType.PROVIDER_CREDENTIALS);
    }

    @Override
    public boolean supportsProduction() {
        return false;
    }

    private FiscalSecretResolution resolve(String reference, BillingEnvironment environment, FiscalSecretType type) {
        if (environment == BillingEnvironment.PROD) {
            throw new BillingConflictException(PRODUCTIVE_RESOLVER_NOT_CONFIGURED_MESSAGE);
        }
        String normalized = normalizeAndValidate(reference);
        if (!ALLOWED_PLACEHOLDERS.getOrDefault(environment, Map.of()).getOrDefault(type, Set.of()).contains(normalized)) {
            throw new BillingBusinessRuleException("Referencia fiscal no permitida para este ambiente.");
        }
        return new FiscalSecretResolution(type, environment, true);
    }

    private String normalizeAndValidate(String reference) {
        if (reference == null || reference.trim().isEmpty()) {
            throw new BillingBusinessRuleException("Referencia fiscal requerida.");
        }
        String normalized = reference.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() > MAX_REF_LENGTH) {
            throw new BillingBusinessRuleException("Referencia fiscal excede longitud maxima.");
        }
        String lowered = normalized.toLowerCase(Locale.ROOT);
        if (containsControlOrWhitespace(normalized)) {
            throw new BillingBusinessRuleException("Referencia fiscal contiene caracteres no permitidos.");
        }
        if (normalized.contains("..") || normalized.contains("/") || normalized.contains("\\") || normalized.startsWith("~")) {
            throw new BillingBusinessRuleException("Referencia fiscal no debe contener rutas.");
        }
        if (normalized.matches("^[A-Z]:.*") || lowered.startsWith("file:")) {
            throw new BillingBusinessRuleException("Referencia fiscal no debe ser una ruta local.");
        }
        if (CERTIFICATE_EXTENSIONS.stream().anyMatch(lowered::endsWith)) {
            throw new BillingBusinessRuleException("Referencia fiscal no debe apuntar a archivos de certificado.");
        }
        if (!normalized.matches("^[A-Z0-9_]+$")) {
            throw new BillingBusinessRuleException("Referencia fiscal contiene caracteres no permitidos.");
        }
        return normalized;
    }

    private boolean containsControlOrWhitespace(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl(ch) || Character.isWhitespace(ch));
    }
}
