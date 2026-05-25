package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

public record CreateBillingSeriesCommand(
        ElectronicDocumentType documentType,
        String series,
        Long currentNumber,
        BillingEnvironment environment,
        Boolean active
) {

    public CreateBillingSeriesCommand(
            ElectronicDocumentType documentType,
            String series,
            Long currentNumber,
            BillingEnvironment environment
    ) {
        this(documentType, series, currentNumber, environment, null);
    }
}

