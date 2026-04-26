package com.erppos.backend.erp.billing.domain.model;

public record ProviderSendResult(
        ElectronicDocumentStatus status,
        String ticket,
        String message
) {
}

