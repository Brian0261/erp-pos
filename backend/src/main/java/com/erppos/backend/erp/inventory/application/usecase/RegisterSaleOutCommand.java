package com.erppos.backend.erp.inventory.application.usecase;

import java.math.BigDecimal;

public record RegisterSaleOutCommand(
        Long productId,
        Long warehouseId,
        BigDecimal quantity,
        String reason,
        String referenceType,
        String referenceId
) {
}

