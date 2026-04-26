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
                trimToNull(command.certificatePath()),
                trimToNull(command.certificatePassword()),
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

        return profileRepositoryPort.save(new CompanyBillingProfile(
                current.id(),
                command.ruc().trim(),
                command.legalName().trim(),
                command.fiscalAddress().trim(),
                command.environment(),
                trimToNull(command.certificatePath()),
                trimToNull(command.certificatePassword()),
                command.active() == null || command.active(),
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

