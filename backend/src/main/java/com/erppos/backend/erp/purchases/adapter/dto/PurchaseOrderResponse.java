package com.erppos.backend.erp.purchases.adapter.dto;

import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PurchaseOrderResponse(
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
        List<PurchaseOrderItemResponse> items
) {
}

