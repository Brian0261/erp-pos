package com.erppos.backend.erp.inventory.application.usecase;

import java.math.BigDecimal;

public record TransferStockItemCommand(
        Long productId,
        BigDecimal quantity
) {
}

