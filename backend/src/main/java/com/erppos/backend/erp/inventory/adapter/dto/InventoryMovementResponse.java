package com.erppos.backend.erp.inventory.adapter.dto;

import com.erppos.backend.erp.inventory.domain.model.InventoryMovementType;

import java.math.BigDecimal;
import java.time.Instant;

public record InventoryMovementResponse(
        Long id,
        Long productId,
        Long warehouseId,
        InventoryMovementType movementType,
        BigDecimal quantity,
        BigDecimal previousStock,
        BigDecimal newStock,
        String reason,
        String referenceType,
        String referenceId,
        Instant createdAt,
        String createdBy
) {
}

