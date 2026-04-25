package com.erppos.backend.erp.inventory.domain.model;

import java.math.BigDecimal;

public record StockTransferItem(
        Long id,
        Long transferId,
        Long productId,
        BigDecimal quantity
) {
}

