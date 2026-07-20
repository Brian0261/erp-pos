package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

public record UpdateBillingSeriesCommand(
        ElectronicDocumentType documentType,
        String series,
        Long currentNumber,
        BillingEnvironment environment,
        Boolean active,
        Long expectedVersion
) {
    public UpdateBillingSeriesCommand(
            ElectronicDocumentType documentType,
            String series,
            Long currentNumber,
            BillingEnvironment environment,
            Boolean active
    ) {
        this(documentType, series, currentNumber, environment, active, null);
    }
}

