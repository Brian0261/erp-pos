package com.erppos.backend.erp.inventory.adapter.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record StockResponse(
        Long id,
        Long productId,
        Long warehouseId,
        BigDecimal quantity,
        Long version,
        Instant updatedAt
) {
}

