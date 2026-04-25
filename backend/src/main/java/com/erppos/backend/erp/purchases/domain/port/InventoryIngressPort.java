package com.erppos.backend.erp.purchases.domain.port;

import java.math.BigDecimal;

public interface InventoryIngressPort {
    void registerPurchaseIn(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId);
}

