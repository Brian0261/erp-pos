package com.erppos.backend.erp.admin.cleanup.adapter.rest;

import java.util.List;

public record ProductCleanupExecuteResponse(
        List<Long> deletedProductIds,
        List<Long> deletedSaleIds,
        List<Long> deletedPurchaseOrderIds,
        List<Long> deletedPurchaseReceiptIds,
        int deletedProducts,
        int deletedSales,
        int deletedSaleItems,
        int deletedSalePayments,
        int deletedQuoteItems,
        int deletedPurchaseOrders,
        int deletedPurchaseOrderItems,
        int deletedPurchaseReceipts,
        int deletedPurchaseReceiptItems,
        int deletedStockTransferItems,
        int deletedStockBalances,
        int deletedInventoryMovements
) {
}
