package com.erppos.backend.erp.purchases.application.usecase;

import java.math.BigDecimal;

public record ReceivePurchaseItemCommand(
        Long purchaseOrderItemId,
        BigDecimal quantityReceived
) {
}

