package com.erppos.backend.erp.sales.application.usecase;

import java.math.BigDecimal;

public record CreateSaleItemCommand(
        Long productId,
        BigDecimal quantity,
        BigDecimal discountAmount
) {
}

