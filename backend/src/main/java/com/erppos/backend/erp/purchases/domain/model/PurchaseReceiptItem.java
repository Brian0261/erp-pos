package com.erppos.backend.erp.purchases.domain.model;

import java.math.BigDecimal;

public record PurchaseReceiptItem(
        Long id,
        Long purchaseReceiptId,
        Long purchaseOrderItemId,
        Long productId,
        BigDecimal quantityReceived
) {
}

