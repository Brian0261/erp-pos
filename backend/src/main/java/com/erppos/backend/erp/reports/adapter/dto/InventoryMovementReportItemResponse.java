package com.erppos.backend.erp.reports.adapter.dto;

import com.erppos.backend.erp.inventory.domain.model.InventoryMovementType;

import java.math.BigDecimal;
import java.time.Instant;

public record InventoryMovementReportItemResponse(
        InventoryMovementType movementType,
        String productName,
        String warehouseName,
        BigDecimal quantity,
        BigDecimal previousStock,
        BigDecimal newStock,
        String reason,
        Instant createdAt,
        String createdBy
) {
}

