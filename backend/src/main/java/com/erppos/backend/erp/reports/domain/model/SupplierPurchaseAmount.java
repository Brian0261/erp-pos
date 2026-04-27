package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;

public record SupplierPurchaseAmount(
        Long supplierId,
        String supplierName,
        BigDecimal amount
) {
}

