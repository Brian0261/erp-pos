package com.erppos.backend.erp.purchases.domain.port;

import com.erppos.backend.erp.purchases.domain.model.PurchaseReceipt;

public interface PurchaseReceiptRepositoryPort {
    PurchaseReceipt save(PurchaseReceipt purchaseReceipt);
    boolean existsByPurchaseOrderId(Long purchaseOrderId);
}

