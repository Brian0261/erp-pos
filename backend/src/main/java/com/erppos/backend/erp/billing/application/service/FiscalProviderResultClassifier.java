package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalAttemptResult;
import com.erppos.backend.erp.billing.domain.model.FiscalErrorCategory;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.model.ProviderSendStatus;
import org.springframework.stereotype.Service;

@Service
public class FiscalProviderResultClassifier {

    public FiscalProviderResultClassification classify(ProviderSendResult result) {
        ProviderSendStatus providerStatus = result == null || result.providerStatus() == null
                ? ProviderSendStatus.ERROR
                : result.providerStatus();
        FiscalErrorCategory category = result == null ? FiscalErrorCategory.INTERNAL_ERROR : result.errorCategory();

        return switch (providerStatus) {
            case ACCEPTED -> classification(FiscalAttemptResult.SUCCESS, null, false, ElectronicDocumentStatus.ACCEPTED, providerStatus, false, false);
            case OBSERVED -> classification(FiscalAttemptResult.SUCCESS, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_OBSERVED), false, ElectronicDocumentStatus.ACCEPTED, providerStatus, true, false);
            case REJECTED -> classification(FiscalAttemptResult.FAILED, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_REJECTED), false, ElectronicDocumentStatus.REJECTED, providerStatus, false, false);
            case PENDING -> classification(FiscalAttemptResult.PENDING, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_PENDING), false, ElectronicDocumentStatus.SENT, providerStatus, false, true);
            case TIMEOUT -> ambiguous(categoryOrDefault(category, FiscalErrorCategory.PROVIDER_TIMEOUT), providerStatus);
            case UNAVAILABLE -> ambiguous(categoryOrDefault(category, FiscalErrorCategory.PROVIDER_UNAVAILABLE), providerStatus);
            case COMMUNICATION_ERROR -> ambiguous(categoryOrDefault(category, FiscalErrorCategory.COMMUNICATION_ERROR), providerStatus);
            case CONFIGURATION_ERROR -> classification(FiscalAttemptResult.FAILED, categoryOrDefault(category, FiscalErrorCategory.CONFIGURATION_ERROR), false, ElectronicDocumentStatus.ERROR, providerStatus, false, false);
            case ERROR -> category == FiscalErrorCategory.CONFIGURATION_ERROR
                    ? classification(FiscalAttemptResult.FAILED, category, false, ElectronicDocumentStatus.ERROR, providerStatus, false, false)
                    : ambiguous(categoryOrDefault(category, FiscalErrorCategory.PROVIDER_UNAVAILABLE), providerStatus);
        };
    }

    public FiscalProviderResultClassification classifyException(RuntimeException ex) {
        String description = ((ex.getClass().getSimpleName() + " " + ex.getMessage()).toLowerCase());
        if (description.contains("timeout") || description.contains("timed out")) {
            return ambiguous(FiscalErrorCategory.PROVIDER_TIMEOUT, ProviderSendStatus.TIMEOUT);
        }
        if (description.contains("unavailable")
                || description.contains("connection")
                || description.contains("connect")
                || description.contains("refused")
                || description.contains("socket")) {
            return ambiguous(FiscalErrorCategory.PROVIDER_UNAVAILABLE, ProviderSendStatus.UNAVAILABLE);
        }
        return ambiguous(FiscalErrorCategory.COMMUNICATION_ERROR, ProviderSendStatus.COMMUNICATION_ERROR);
    }

    private FiscalProviderResultClassification ambiguous(
            FiscalErrorCategory category,
            ProviderSendStatus providerStatus
    ) {
        return classification(
                FiscalAttemptResult.PENDING,
                category,
                false,
                ElectronicDocumentStatus.SENT,
                providerStatus,
                false,
                true
        );
    }

    private FiscalProviderResultClassification classification(
            FiscalAttemptResult attemptResult,
            FiscalErrorCategory errorCategory,
            boolean recoverable,
            ElectronicDocumentStatus finalDocumentStatus,
            ProviderSendStatus providerStatus,
            boolean observed,
            boolean pending
    ) {
        return new FiscalProviderResultClassification(
                attemptResult,
                errorCategory,
                recoverable,
                finalDocumentStatus,
                providerStatus,
                observed,
                pending
        );
    }

    private FiscalErrorCategory categoryOrDefault(FiscalErrorCategory category, FiscalErrorCategory fallback) {
        return category == null ? fallback : category;
    }

}
