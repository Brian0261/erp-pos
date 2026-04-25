package com.erppos.backend.erp.inventory.application.usecase;

import java.math.BigDecimal;

public record RegisterAdjustmentCommand(
        Long productId,
        Long warehouseId,
        BigDecimal quantity,
        boolean positive,
        String reason
) {
}

