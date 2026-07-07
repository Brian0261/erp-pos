package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.application.usecase.CompanyBillingProfileUseCase;
import com.erppos.backend.erp.billing.application.usecase.CreateCompanyBillingProfileCommand;
import com.erppos.backend.erp.billing.application.usecase.UpdateCompanyBillingProfileCommand;
import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.domain.port.CompanyBillingProfileRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class CompanyBillingProfileApplicationService implements CompanyBillingProfileUseCase {

    private final CompanyBillingProfileRepositoryPort profileRepositoryPort;
    private final AuditUserProvider auditUserProvider;

    public CompanyBillingProfileApplicationService(
            CompanyBillingProfileRepositoryPort profileRepositoryPort,
            AuditUserProvider auditUserProvider
    ) {
        this.profileRepositoryPort = profileRepositoryPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    @Transactional
    public CompanyBillingProfile create(CreateCompanyBillingProfileCommand command) {
        validate(command.ruc(), command.legalName(), command.fiscalAddress(), command.environment());
        FiscalSecretConfig fiscalSecretConfig = validateFiscalSecretConfig(
                command.environment(),
                true,
                trimToNull(command.certificatePath()),
                trimToNull(command.certificatePassword()),
                trimToNull(command.certificateSecretRef()),
                trimToNull(command.certificatePasswordSecretRef()),
                trimToNull(command.providerSecretRef()),
                trimToNull(command.certificateAlias()),
                normalizeCode(command.secretProvider())
        );
        if (profileRepositoryPort.findActiveByEnvironment(command.environment()).isPresent()) {
            throw new BillingConflictException("There is already an active billing profile for environment " + command.environment());
        }

        String actor = auditUserProvider.currentUsername();
        return profileRepositoryPort.save(new CompanyBillingProfile(
                null,
                command.ruc().trim(),
                command.legalName().trim(),
                command.fiscalAddress().trim(),
                command.environment(),
                fiscalSecretConfig.certificatePath(),
                fiscalSecretConfig.certificateSecretRef(),
                fiscalSecretConfig.certificatePasswordSecretRef(),
                fiscalSecretConfig.providerSecretRef(),
                fiscalSecretConfig.certificateAlias(),
                fiscalSecretConfig.secretProvider(),
                true,
                null,
                null,
                actor,
                actor
        ));
    }

    @Override
    public CompanyBillingProfile get(BillingEnvironment environment) {
        return profileRepositoryPort.findActiveByEnvironment(environment)
                .orElseThrow(() -> new BillingNotFoundException("Billing profile not found for environment " + environment));
    }

    @Override
    @Transactional
    public CompanyBillingProfile update(UpdateCompanyBillingProfileCommand command) {
        validate(command.ruc(), command.legalName(), command.fiscalAddress(), command.environment());

        CompanyBillingProfile current = profileRepositoryPort.findActiveByEnvironment(command.environment())
                .orElseThrow(() -> new BillingNotFoundException("Billing profile not found for environment " + command.environment()));

        boolean active = command.active() == null || command.active();
        FiscalSecretConfig fiscalSecretConfig = validateFiscalSecretConfig(
                command.environment(),
                active,
                preferRequestedOrCurrent(command.certificatePath(), current.certificatePath()),
                trimToNull(command.certificatePassword()),
                preferRequestedOrCurrent(command.certificateSecretRef(), current.certificateSecretRef()),
                preferRequestedOrCurrent(command.certificatePasswordSecretRef(), current.certificatePasswordSecretRef()),
                preferRequestedOrCurrent(command.providerSecretRef(), current.providerSecretRef()),
                preferRequestedOrCurrent(command.certificateAlias(), current.certificateAlias()),
                preferRequestedOrCurrentCode(command.secretProvider(), current.secretProvider())
        );

        return profileRepositoryPort.save(new CompanyBillingProfile(
                current.id(),
                command.ruc().trim(),
                command.legalName().trim(),
                command.fiscalAddress().trim(),
                command.environment(),
                fiscalSecretConfig.certificatePath(),
                fiscalSecretConfig.certificateSecretRef(),
                fiscalSecretConfig.certificatePasswordSecretRef(),
                fiscalSecretConfig.providerSecretRef(),
                fiscalSecretConfig.certificateAlias(),
                fiscalSecretConfig.secretProvider(),
                active,
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        ));
    }

    private void validate(String ruc, String legalName, String fiscalAddress, BillingEnvironment environment) {
        if (ruc == null || !ruc.matches("^[0-9]{11}$")) {
            throw new BillingBusinessRuleException("ruc must contain exactly 11 digits");
        }
        if (legalName == null || legalName.trim().isEmpty()) {
            throw new BillingBusinessRuleException("legalName is required");
        }
        if (fiscalAddress == null || fiscalAddress.trim().isEmpty()) {
            throw new BillingBusinessRuleException("fiscalAddress is required");
        }
        if (environment == null) {
            throw new BillingBusinessRuleException("environment is required");
        }
    }

    private FiscalSecretConfig validateFiscalSecretConfig(
            BillingEnvironment environment,
            boolean active,
            String certificatePath,
            String certificatePassword,
            String certificateSecretRef,
            String certificatePasswordSecretRef,
            String providerSecretRef,
            String certificateAlias,
            String secretProvider
    ) {
        validateLength("certificatePath", certificatePath, 300);
        validateSecretReference("certificateSecretRef", certificateSecretRef, 300);
        validateSecretReference("certificatePasswordSecretRef", certificatePasswordSecretRef, 300);
        validateSecretReference("providerSecretRef", providerSecretRef, 300);
        validateAlias(certificateAlias);
        validateCode("secretProvider", secretProvider, 60);

        if (certificatePassword != null && environment == BillingEnvironment.PROD) {
            throw new BillingBusinessRuleException("certificatePassword is not accepted for PROD; use certificatePasswordSecretRef");
        }
        if (certificatePath != null && environment == BillingEnvironment.PROD) {
            throw new BillingBusinessRuleException("certificatePath is deprecated for PROD; use certificateSecretRef or certificateAlias");
        }
        if (active && environment == BillingEnvironment.PROD) {
            if (certificateSecretRef == null && certificateAlias == null) {
                throw new BillingBusinessRuleException("PROD billing profile requires certificateSecretRef or certificateAlias");
            }
            if (certificatePasswordSecretRef == null) {
                throw new BillingBusinessRuleException("PROD billing profile requires certificatePasswordSecretRef");
            }
            if (providerSecretRef == null) {
                throw new BillingBusinessRuleException("PROD billing profile requires providerSecretRef");
            }
            if (secretProvider == null) {
                throw new BillingBusinessRuleException("PROD billing profile requires secretProvider");
            }
            validateNoProdPlaceholder("certificateSecretRef", certificateSecretRef);
            validateNoProdPlaceholder("certificatePasswordSecretRef", certificatePasswordSecretRef);
            validateNoProdPlaceholder("providerSecretRef", providerSecretRef);
            validateNoProdPlaceholder("certificateAlias", certificateAlias);
            validateProductionSecretProvider(secretProvider);
        }

        return new FiscalSecretConfig(
                certificatePath,
                certificateSecretRef,
                certificatePasswordSecretRef,
                providerSecretRef,
                certificateAlias,
                secretProvider
        );
    }

    private void validateSecretReference(String fieldName, String value, int maxLength) {
        validateLength(fieldName, value, maxLength);
        if (value == null) {
            return;
        }
        if (containsWhitespace(value) || containsControlCharacter(value) || !value.matches("^[A-Za-z0-9][A-Za-z0-9._:/@+=-]*$")) {
            throw new BillingBusinessRuleException(fieldName + " contains invalid characters");
        }
        if (looksLikeDirectPath(value)) {
            throw new BillingBusinessRuleException(fieldName + " must reference managed secret storage, not a local path");
        }
    }

    private void validateAlias(String value) {
        validateLength("certificateAlias", value, 120);
        if (value == null) {
            return;
        }
        if (containsWhitespace(value) || containsControlCharacter(value) || !value.matches("^[A-Za-z0-9][A-Za-z0-9._:/@+=-]*$")) {
            throw new BillingBusinessRuleException("certificateAlias contains invalid characters");
        }
        if (looksLikeDirectPath(value)) {
            throw new BillingBusinessRuleException("certificateAlias must not be a local path");
        }
    }

    private void validateCode(String fieldName, String value, int maxLength) {
        validateLength(fieldName, value, maxLength);
        if (value == null) {
            return;
        }
        if (containsControlCharacter(value) || !value.matches("^[A-Z0-9][A-Z0-9_-]*$")) {
            throw new BillingBusinessRuleException(fieldName + " contains invalid characters");
        }
    }

    private void validateNoProdPlaceholder(String fieldName, String value) {
        if (value == null) {
            return;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("LOCAL_") || normalized.startsWith("BETA_")) {
            throw new BillingBusinessRuleException(fieldName + " must not use development placeholders in PROD");
        }
    }

    private void validateProductionSecretProvider(String secretProvider) {
        String normalized = secretProvider.trim().toUpperCase(Locale.ROOT);
        if (normalized.equals("LOCAL") || normalized.equals("MOCK") || normalized.equals("NOOP")
                || normalized.startsWith("LOCAL_") || normalized.startsWith("BETA_")) {
            throw new BillingBusinessRuleException("secretProvider must be production managed for PROD");
        }
    }

    private void validateLength(String fieldName, String value, int maxLength) {
        if (value != null && value.length() > maxLength) {
            throw new BillingBusinessRuleException(fieldName + " exceeds max length");
        }
    }

    private String preferRequestedOrCurrent(String requested, String current) {
        String normalized = trimToNull(requested);
        return normalized != null ? normalized : current;
    }

    private String preferRequestedOrCurrentCode(String requested, String current) {
        String normalized = normalizeCode(requested);
        return normalized != null ? normalized : normalizeCode(current);
    }

    private String normalizeCode(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean containsWhitespace(String value) {
        return value.chars().anyMatch(Character::isWhitespace);
    }

    private boolean containsControlCharacter(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl(ch));
    }

    private boolean looksLikeDirectPath(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.matches("^[a-z]:[\\\\/].*")
                || normalized.startsWith("/")
                || normalized.startsWith("\\\\")
                || normalized.startsWith("~")
                || normalized.startsWith("file:");
    }

    private record FiscalSecretConfig(
            String certificatePath,
            String certificateSecretRef,
            String certificatePasswordSecretRef,
            String providerSecretRef,
            String certificateAlias,
            String secretProvider
    ) {
    }
}

