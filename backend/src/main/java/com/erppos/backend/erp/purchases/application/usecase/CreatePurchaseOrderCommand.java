package com.erppos.backend.erp.purchases.application.usecase;

import java.time.LocalDate;
import java.util.List;

public record CreatePurchaseOrderCommand(
        Long supplierId,
        Long warehouseId,
        LocalDate orderDate,
        LocalDate expectedDate,
        String notes,
        List<PurchaseOrderItemCommand> items
) {
}

