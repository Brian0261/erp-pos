package com.erppos.backend.erp.reports.domain.model;

import com.erppos.backend.erp.inventory.domain.model.InventoryMovementType;

import java.math.BigDecimal;
import java.time.Instant;

public record InventoryMovementReportItem(
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

