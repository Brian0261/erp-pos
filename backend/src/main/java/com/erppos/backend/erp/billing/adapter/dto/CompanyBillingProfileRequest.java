package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CompanyBillingProfileRequest(
        @NotBlank @Pattern(regexp = "^[0-9]{11}$") String ruc,
        @NotBlank String legalName,
        @NotBlank String fiscalAddress,
        @NotNull BillingEnvironment environment,
        String certificatePath,
        String certificatePassword,
        Boolean active
) {
}

