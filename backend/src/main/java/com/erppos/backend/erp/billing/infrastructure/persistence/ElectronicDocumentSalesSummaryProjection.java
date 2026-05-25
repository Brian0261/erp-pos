package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

import java.time.Instant;

public interface ElectronicDocumentSalesSummaryProjection {
    Long getSaleId();

    Long getDocumentId();

    ElectronicDocumentType getDocumentType();

    String getFullNumber();

    ElectronicDocumentStatus getStatus();

    BillingEnvironment getEnvironment();

    Instant getCreatedAt();
}
