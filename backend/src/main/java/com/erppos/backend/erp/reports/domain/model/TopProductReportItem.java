package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;

public record TopProductReportItem(
        Long productId,
        String sku,
        String barcode,
        String productName,
        BigDecimal quantitySold,
        BigDecimal totalAmount
) {
}

