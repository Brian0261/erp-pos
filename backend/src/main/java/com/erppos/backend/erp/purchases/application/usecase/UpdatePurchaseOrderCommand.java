package com.erppos.backend.erp.purchases.application.usecase;

import java.time.LocalDate;
import java.util.List;

public record UpdatePurchaseOrderCommand(
        Long supplierId,
        Long warehouseId,
        LocalDate expectedDate,
        String notes,
        List<PurchaseOrderItemCommand> items
) {
}

