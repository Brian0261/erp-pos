package com.erppos.backend.erp.reports.adapter.dto;

import java.math.BigDecimal;
import java.util.List;

public record PurchasesReportResponse(
        BigDecimal totalPurchaseAmount,
        long purchaseOrderCount,
        long receivedOrdersCount,
        List<SupplierPurchaseAmountResponse> purchasesBySupplier
) {
}

