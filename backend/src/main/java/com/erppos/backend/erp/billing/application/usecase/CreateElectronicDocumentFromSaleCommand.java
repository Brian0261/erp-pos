package com.erppos.backend.erp.billing.application.usecase;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

public record CreateElectronicDocumentFromSaleCommand(
        ElectronicDocumentType documentType,
        Long billingSeriesId,
        String customerName,
        String customerDocument
) {
}

