package com.erppos.backend.erp.purchases.application.usecase;

import java.time.LocalDate;
import java.util.List;

public record ReceivePurchaseOrderCommand(
        LocalDate receiptDate,
        String notes,
        List<ReceivePurchaseItemCommand> items
) {
}

