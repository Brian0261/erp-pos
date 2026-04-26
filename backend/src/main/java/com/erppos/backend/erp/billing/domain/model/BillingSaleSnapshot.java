package com.erppos.backend.erp.billing.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record BillingSaleSnapshot(
        Long id,
        Long warehouseId,
        String saleNumber,
        String status,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        Instant soldAt,
        String createdBy,
        List<BillingSaleItemSnapshot> items
) {
}

