package com.erppos.backend.erp.purchases.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PurchaseOrder(
        Long id,
        Long supplierId,
        Long warehouseId,
        PurchaseOrderStatus status,
        LocalDate orderDate,
        LocalDate expectedDate,
        BigDecimal totalAmount,
        String notes,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy,
        List<PurchaseOrderItem> items
) {
}

