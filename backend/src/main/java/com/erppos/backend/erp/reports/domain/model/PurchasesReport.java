package com.erppos.backend.erp.reports.domain.model;

import java.math.BigDecimal;
import java.util.List;

public record PurchasesReport(
        BigDecimal totalPurchaseAmount,
        long purchaseOrderCount,
        long receivedOrdersCount,
        List<SupplierPurchaseAmount> purchasesBySupplier
) {
}

