package com.erppos.backend.erp.purchases.domain.model;

import java.math.BigDecimal;

public record PurchaseOrderItem(
        Long id,
        Long purchaseOrderId,
        Long productId,
        BigDecimal quantityOrdered,
        BigDecimal quantityReceived,
        BigDecimal unitCost,
        BigDecimal lineTotal
) {
}

