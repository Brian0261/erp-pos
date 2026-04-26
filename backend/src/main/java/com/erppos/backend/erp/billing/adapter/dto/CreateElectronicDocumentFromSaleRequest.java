package com.erppos.backend.erp.billing.adapter.dto;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import jakarta.validation.constraints.NotNull;

public record CreateElectronicDocumentFromSaleRequest(
        @NotNull ElectronicDocumentType documentType,
        @NotNull Long billingSeriesId,
        String customerName,
        String customerDocument
) {
}

