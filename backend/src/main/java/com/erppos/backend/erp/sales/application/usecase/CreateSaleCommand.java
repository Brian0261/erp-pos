package com.erppos.backend.erp.sales.application.usecase;

import java.util.List;

public record CreateSaleCommand(
        Long warehouseId,
        List<CreateSaleItemCommand> items,
        List<CreateSalePaymentCommand> payments
) {
}

