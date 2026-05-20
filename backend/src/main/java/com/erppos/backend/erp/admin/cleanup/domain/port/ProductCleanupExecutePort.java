package com.erppos.backend.erp.admin.cleanup.domain.port;

import java.util.Set;

public interface ProductCleanupExecutePort {

    int deleteSaleItemsBySaleIds(Set<Long> saleIds);

    int deleteSalePaymentsBySaleIds(Set<Long> saleIds);

    int deleteQuoteItemsByProductIds(Set<Long> productIds);

    int deletePurchaseReceiptItemsByIds(Set<Long> purchaseReceiptIds);

    int deletePurchaseReceiptsByIds(Set<Long> purchaseReceiptIds);

    int deletePurchaseOrderItemsByIds(Set<Long> purchaseOrderIds);

    int deletePurchaseOrdersByIds(Set<Long> purchaseOrderIds);

    int deleteStockTransferItemsByProductIds(Set<Long> productIds);

    int deleteStockBalancesByProductIds(Set<Long> productIds);

    int deleteInventoryMovementsByProductIds(Set<Long> productIds);

    int deleteSalesByIds(Set<Long> saleIds);

    int deleteProductsByIds(Set<Long> productIds);
}
