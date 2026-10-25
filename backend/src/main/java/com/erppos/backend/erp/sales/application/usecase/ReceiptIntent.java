package com.erppos.backend.erp.sales.application.usecase;

public record ReceiptIntent(String receiptType, Payload payload) {
    public record Payload(String documentType, Long billingSeriesId, String customerName, String customerDocument) {}
}
