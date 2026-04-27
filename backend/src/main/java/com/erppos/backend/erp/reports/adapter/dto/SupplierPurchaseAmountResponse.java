package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;

public record SupplierPurchaseAmountResponse(
        Long supplierId,
        String supplierName,
        BigDecimal amount
) {
}

