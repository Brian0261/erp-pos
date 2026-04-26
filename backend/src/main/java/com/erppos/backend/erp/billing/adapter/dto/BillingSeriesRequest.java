package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record BillingSeriesRequest(
        @NotNull ElectronicDocumentType documentType,
        @NotBlank String series,
        @NotNull @Min(1) Long currentNumber,
        @NotNull BillingEnvironment environment,
        Boolean active
) {
}

