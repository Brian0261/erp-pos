package com.erppos.backend.erp.admin.cleanup.application.usecase;

import java.util.List;

public record ProductCleanupExecuteResult(
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
