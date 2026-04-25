package com.erppos.backend.erp.inventory.adapter.dto;

import java.time.Instant;

public record StockTransferResponse(
        Long id,
        Long sourceWarehouseId,
        Long targetWarehouseId,
        String status,
        String reason,
        Instant createdAt,
        String createdBy
) {
}

