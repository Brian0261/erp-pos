package com.erppos.backend.erp.integrations.domain.model;

public enum OutboxEventType {
    PRODUCT_CREATED,
    PRODUCT_UPDATED,
    STOCK_CHANGED,
    SALE_COMPLETED,
    SALE_VOIDED,
    PURCHASE_RECEIVED,
    QUOTE_CONVERTED,
    ELECTRONIC_DOCUMENT_ACCEPTED
}

