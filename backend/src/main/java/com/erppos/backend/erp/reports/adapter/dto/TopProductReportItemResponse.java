package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;

public record TopProductReportItemResponse(
        Long productId,
        String sku,
        String barcode,
        String productName,
        BigDecimal quantitySold,
        BigDecimal totalAmount
) {
}

