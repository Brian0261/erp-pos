package com.erppos.backend.erp.inventory.application.usecase;

import java.math.BigDecimal;

public record RegisterInitialStockCommand(
        Long productId,
        Long warehouseId,
        BigDecimal quantity,
        String reason
) {
}

