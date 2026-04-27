package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;

public record LowStockItemResponse(
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

