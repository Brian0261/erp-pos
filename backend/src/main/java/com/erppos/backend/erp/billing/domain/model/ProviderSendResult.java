package com.erppos.backend.erp.billing.domain.model;

public record ProviderSendResult(
        ElectronicDocumentStatus status,
        String ticket,
        String message,
        ProviderSendStatus providerStatus,
        String providerCode,
        String providerCorrelationId,
        FiscalErrorCategory errorCategory,
        boolean recoverable,
        boolean observed,
        boolean pending,
        boolean simulated
) {

    public ProviderSendResult {
        if (providerStatus == null) {
            providerStatus = ProviderSendStatus.fromDocumentStatus(status);
        }
        if (errorCategory == null) {
            errorCategory = defaultErrorCategory(providerStatus);
        }
        recoverable = recoverable || isRecoverable(errorCategory);
        observed = observed || providerStatus == ProviderSendStatus.OBSERVED;
        pending = pending || providerStatus == ProviderSendStatus.PENDING;
    }

    public ProviderSendResult(ElectronicDocumentStatus status, String ticket, String message) {
        this(status, ticket, message, ProviderSendStatus.fromDocumentStatus(status), null, null, null, false, false, false, false);
    }

    public static ProviderSendResult accepted(String ticket, String message) {
        return new ProviderSendResult(ElectronicDocumentStatus.ACCEPTED, ticket, message, ProviderSendStatus.ACCEPTED, null, null, null, false, false, false, false);
    }

    public static ProviderSendResult observed(String ticket, String message) {
        return new ProviderSendResult(ElectronicDocumentStatus.ACCEPTED, ticket, message, ProviderSendStatus.OBSERVED, null, null, FiscalErrorCategory.PROVIDER_OBSERVED, false, true, false, false);
    }

    public static ProviderSendResult rejected(String ticket, String message) {
        return new ProviderSendResult(ElectronicDocumentStatus.REJECTED, ticket, message, ProviderSendStatus.REJECTED, null, null, FiscalErrorCategory.PROVIDER_REJECTED, false, false, false, false);
    }

    public static ProviderSendResult pending(String ticket, String message) {
        return new ProviderSendResult(ElectronicDocumentStatus.SENT, ticket, message, ProviderSendStatus.PENDING, null, null, FiscalErrorCategory.PROVIDER_PENDING, false, false, true, false);
    }

    public static ProviderSendResult timeout(String ticket, String message) {
        return new ProviderSendResult(ElectronicDocumentStatus.ERROR, ticket, message, ProviderSendStatus.TIMEOUT, null, null, FiscalErrorCategory.PROVIDER_TIMEOUT, true, false, false, false);
    }

    public static ProviderSendResult unavailable(String ticket, String message) {
        return new ProviderSendResult(ElectronicDocumentStatus.ERROR, ticket, message, ProviderSendStatus.UNAVAILABLE, null, null, FiscalErrorCategory.PROVIDER_UNAVAILABLE, true, false, false, false);
    }

    public static ProviderSendResult communicationError(String ticket, String message) {
        return new ProviderSendResult(ElectronicDocumentStatus.ERROR, ticket, message, ProviderSendStatus.COMMUNICATION_ERROR, null, null, FiscalErrorCategory.COMMUNICATION_ERROR, true, false, false, false);
    }

    public static ProviderSendResult configurationError(String ticket, String message) {
        return new ProviderSendResult(ElectronicDocumentStatus.ERROR, ticket, message, ProviderSendStatus.CONFIGURATION_ERROR, null, null, FiscalErrorCategory.CONFIGURATION_ERROR, false, false, false, false);
    }

    private static FiscalErrorCategory defaultErrorCategory(ProviderSendStatus providerStatus) {
        return switch (providerStatus) {
            case ACCEPTED -> null;
            case OBSERVED -> FiscalErrorCategory.PROVIDER_OBSERVED;
            case REJECTED -> FiscalErrorCategory.PROVIDER_REJECTED;
            case PENDING -> FiscalErrorCategory.PROVIDER_PENDING;
            case TIMEOUT -> FiscalErrorCategory.PROVIDER_TIMEOUT;
            case UNAVAILABLE, ERROR -> FiscalErrorCategory.PROVIDER_UNAVAILABLE;
            case COMMUNICATION_ERROR -> FiscalErrorCategory.COMMUNICATION_ERROR;
            case CONFIGURATION_ERROR -> FiscalErrorCategory.CONFIGURATION_ERROR;
        };
    }

    private static boolean isRecoverable(FiscalErrorCategory errorCategory) {
        return errorCategory == FiscalErrorCategory.PROVIDER_TIMEOUT
                || errorCategory == FiscalErrorCategory.PROVIDER_UNAVAILABLE
                || errorCategory == FiscalErrorCategory.COMMUNICATION_ERROR;
    }
}

