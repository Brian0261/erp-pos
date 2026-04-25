package com.erppos.backend.erp.purchases.adapter.dto;

import java.math.BigDecimal;

public record PurchaseOrderItemResponse(
        Long id,
        Long productId,
        BigDecimal quantityOrdered,
        BigDecimal quantityReceived,
        BigDecimal unitCost,
        BigDecimal lineTotal
) {
}

