package com.erppos.backend.erp.billing.adapter.rest;

import com.erppos.backend.erp.billing.adapter.dto.CompanyBillingProfileRequest;
import com.erppos.backend.erp.billing.adapter.dto.CompanyBillingProfileResponse;
import com.erppos.backend.erp.billing.application.usecase.CompanyBillingProfileUseCase;
import com.erppos.backend.erp.billing.application.usecase.CreateCompanyBillingProfileCommand;
import com.erppos.backend.erp.billing.application.usecase.UpdateCompanyBillingProfileCommand;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/billing/company-profile")
public class BillingCompanyProfileController {

    private final CompanyBillingProfileUseCase profileUseCase;

    public BillingCompanyProfileController(CompanyBillingProfileUseCase profileUseCase) {
        this.profileUseCase = profileUseCase;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompanyBillingProfileResponse> create(@Valid @RequestBody CompanyBillingProfileRequest request) {
        CompanyBillingProfile created = profileUseCase.create(new CreateCompanyBillingProfileCommand(
                request.ruc(),
                request.legalName(),
                request.fiscalAddress(),
                request.environment(),
                request.certificatePath(),
                request.certificatePassword(),
                request.certificateSecretRef(),
                request.certificatePasswordSecretRef(),
                request.providerSecretRef(),
                request.certificateAlias(),
                request.secretProvider()
        ));
        return ResponseEntity.created(URI.create("/api/v1/billing/company-profile")).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompanyBillingProfileResponse> get(@RequestParam(defaultValue = "LOCAL") BillingEnvironment environment) {
        return ResponseEntity.ok(toResponse(profileUseCase.get(environment)));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompanyBillingProfileResponse> update(@Valid @RequestBody CompanyBillingProfileRequest request) {
        CompanyBillingProfile updated = profileUseCase.update(new UpdateCompanyBillingProfileCommand(
                request.ruc(),
                request.legalName(),
                request.fiscalAddress(),
                request.environment(),
                request.certificatePath(),
                request.certificatePassword(),
                request.certificateSecretRef(),
                request.certificatePasswordSecretRef(),
                request.providerSecretRef(),
                request.certificateAlias(),
                request.secretProvider(),
                request.active()
        ));
        return ResponseEntity.ok(toResponse(updated));
    }

    private CompanyBillingProfileResponse toResponse(CompanyBillingProfile profile) {
        return new CompanyBillingProfileResponse(
                profile.id(),
                profile.ruc(),
                profile.legalName(),
                profile.fiscalAddress(),
                profile.environment(),
                isConfigured(profile.certificateSecretRef()) || isConfigured(profile.certificateAlias()),
                isConfigured(profile.providerSecretRef()),
                profile.certificateAlias(),
                profile.secretProvider(),
                profile.active(),
                profile.createdAt(),
                profile.updatedAt()
        );
    }

    private boolean isConfigured(String value) {
        return value != null && !value.trim().isEmpty();
    }
}

