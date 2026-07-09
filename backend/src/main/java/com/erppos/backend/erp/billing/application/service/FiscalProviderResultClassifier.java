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
        ProviderSendStatus providerStatus = result == null ? ProviderSendStatus.ERROR : result.providerStatus();
        FiscalErrorCategory category = result == null ? FiscalErrorCategory.INTERNAL_ERROR : result.errorCategory();
        boolean recoverable = result != null && result.recoverable();

        return switch (providerStatus) {
            case ACCEPTED -> classification(FiscalAttemptResult.SUCCESS, null, false, ElectronicDocumentStatus.ACCEPTED, providerStatus, false, false);
            case OBSERVED -> classification(FiscalAttemptResult.SUCCESS, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_OBSERVED), false, ElectronicDocumentStatus.ACCEPTED, providerStatus, true, false);
            case REJECTED -> classification(FiscalAttemptResult.FAILED, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_REJECTED), false, ElectronicDocumentStatus.REJECTED, providerStatus, false, false);
            case PENDING -> classification(FiscalAttemptResult.PENDING, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_PENDING), false, ElectronicDocumentStatus.SENT, providerStatus, false, true);
            case TIMEOUT -> classification(FiscalAttemptResult.FAILED, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_TIMEOUT), true, ElectronicDocumentStatus.ERROR, providerStatus, false, false);
            case UNAVAILABLE -> classification(FiscalAttemptResult.FAILED, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_UNAVAILABLE), true, ElectronicDocumentStatus.ERROR, providerStatus, false, false);
            case COMMUNICATION_ERROR -> classification(FiscalAttemptResult.FAILED, categoryOrDefault(category, FiscalErrorCategory.COMMUNICATION_ERROR), true, ElectronicDocumentStatus.ERROR, providerStatus, false, false);
            case CONFIGURATION_ERROR -> classification(FiscalAttemptResult.FAILED, categoryOrDefault(category, FiscalErrorCategory.CONFIGURATION_ERROR), false, ElectronicDocumentStatus.ERROR, providerStatus, false, false);
            case ERROR -> classification(FiscalAttemptResult.FAILED, categoryOrDefault(category, FiscalErrorCategory.PROVIDER_UNAVAILABLE), recoverable || isRecoverable(category), ElectronicDocumentStatus.ERROR, providerStatus, false, false);
        };
    }

    public FiscalProviderResultClassification classifyException(RuntimeException ex) {
        String description = ((ex.getClass().getSimpleName() + " " + ex.getMessage()).toLowerCase());
        if (description.contains("timeout") || description.contains("timed out")) {
            return failure(FiscalErrorCategory.PROVIDER_TIMEOUT);
        }
        if (description.contains("unavailable")
                || description.contains("connection")
                || description.contains("connect")
                || description.contains("refused")
                || description.contains("socket")) {
            return failure(FiscalErrorCategory.PROVIDER_UNAVAILABLE);
        }
        return failure(FiscalErrorCategory.COMMUNICATION_ERROR);
    }

    public FiscalProviderResultClassification failure(FiscalErrorCategory category) {
        ProviderSendStatus providerStatus = switch (category) {
            case CONFIGURATION_ERROR -> ProviderSendStatus.CONFIGURATION_ERROR;
            case PROVIDER_TIMEOUT -> ProviderSendStatus.TIMEOUT;
            case PROVIDER_UNAVAILABLE -> ProviderSendStatus.UNAVAILABLE;
            case COMMUNICATION_ERROR -> ProviderSendStatus.COMMUNICATION_ERROR;
            default -> ProviderSendStatus.ERROR;
        };
        return classification(FiscalAttemptResult.FAILED, category, isRecoverable(category), ElectronicDocumentStatus.ERROR, providerStatus, false, false);
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

    private boolean isRecoverable(FiscalErrorCategory category) {
        return category == FiscalErrorCategory.PROVIDER_TIMEOUT
                || category == FiscalErrorCategory.PROVIDER_UNAVAILABLE
                || category == FiscalErrorCategory.COMMUNICATION_ERROR;
    }
}
