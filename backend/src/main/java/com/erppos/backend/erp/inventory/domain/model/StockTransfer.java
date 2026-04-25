package com.erppos.backend.erp.inventory.domain.model;

import java.time.Instant;

public record StockTransfer(
        Long id,
        Long sourceWarehouseId,
        Long targetWarehouseId,
        String status,
        String reason,
        Instant createdAt,
        String createdBy
) {
}

