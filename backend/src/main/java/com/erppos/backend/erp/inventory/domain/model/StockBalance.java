package com.erppos.backend.erp.inventory.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

public record StockBalance(
        Long id,
        Long productId,
        Long warehouseId,
        BigDecimal quantity,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
}

