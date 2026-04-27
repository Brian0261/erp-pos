package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;

public record LowStockItem(
        Long productId,
        String sku,
        String barcode,
        String productName,
        Long warehouseId,
        String warehouseName,
        BigDecimal currentStock,
        BigDecimal threshold
) {
}

