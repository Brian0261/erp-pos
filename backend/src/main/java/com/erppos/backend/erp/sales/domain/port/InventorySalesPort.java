package com.erppos.backend.erp.sales.domain.port;

import java.math.BigDecimal;

public interface InventorySalesPort {
    BigDecimal stockAvailable(Long productId, Long warehouseId);
    void registerSaleOut(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId);
    void registerSaleVoidIn(Long productId, Long warehouseId, BigDecimal quantity, String reason, String referenceType, String referenceId);
}

