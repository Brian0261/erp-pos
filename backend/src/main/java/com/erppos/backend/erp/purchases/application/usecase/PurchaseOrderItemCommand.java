package com.erppos.backend.erp.purchases.application.usecase;

import java.math.BigDecimal;

public record PurchaseOrderItemCommand(
        Long productId,
        BigDecimal quantityOrdered,
        BigDecimal unitCost
) {
}

