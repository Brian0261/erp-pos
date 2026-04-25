package com.erppos.backend.erp.purchases.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PurchaseReceipt(
        Long id,
        Long purchaseOrderId,
        LocalDate receiptDate,
        String notes,
        Instant createdAt,
        String createdBy,
        List<PurchaseReceiptItem> items
) {
}

