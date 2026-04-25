package com.erppos.backend.erp.inventory.application.usecase;

import java.util.List;

public record TransferStockCommand(
        Long sourceWarehouseId,
        Long targetWarehouseId,
        String reason,
        List<TransferStockItemCommand> items
) {
}

