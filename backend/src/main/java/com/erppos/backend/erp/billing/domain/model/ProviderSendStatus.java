package com.erppos.backend.erp.billing.domain.model;

public enum ProviderSendStatus {
    ACCEPTED,
    OBSERVED,
    REJECTED,
    PENDING,
    ERROR,
    TIMEOUT,
    UNAVAILABLE,
    COMMUNICATION_ERROR,
    CONFIGURATION_ERROR;

    public static ProviderSendStatus fromDocumentStatus(ElectronicDocumentStatus status) {
        if (status == ElectronicDocumentStatus.ACCEPTED) {
            return ACCEPTED;
        }
        if (status == ElectronicDocumentStatus.REJECTED) {
            return REJECTED;
        }
        if (status == ElectronicDocumentStatus.SENT) {
            return PENDING;
        }
        if (status == ElectronicDocumentStatus.ERROR) {
            return ERROR;
        }
        return ERROR;
    }
}
