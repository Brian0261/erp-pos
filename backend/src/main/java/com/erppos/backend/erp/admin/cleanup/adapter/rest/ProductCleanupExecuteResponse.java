package com.erppos.backend.erp.admin.cleanup.adapter.rest;

import java.util.List;

public record ProductCleanupExecuteResponse(
        List<Long> deletedProductIds,
        List<Long> deletedSaleIds,
        int deletedProducts,
        int deletedSales,
        int deletedSaleItems,
        int deletedSalePayments,
        int deletedQuoteItems,
        int deletedPurchaseOrderItems,
        int deletedPurchaseReceiptItems,
        int deletedStockTransferItems,
        int deletedStockBalances,
        int deletedInventoryMovements
) {
}
