package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalAttemptResult;
import com.erppos.backend.erp.billing.domain.model.FiscalErrorCategory;
import com.erppos.backend.erp.billing.domain.model.ProviderSendStatus;

public record FiscalProviderResultClassification(
        FiscalAttemptResult attemptResult,
        FiscalErrorCategory errorCategory,
        boolean recoverable,
        ElectronicDocumentStatus finalDocumentStatus,
        ProviderSendStatus providerStatus,
        boolean observed,
        boolean pending
) {
}
