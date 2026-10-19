package com.erppos.backend.erp.sales.domain.port;

import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;
import java.util.List;

public interface CheckoutReadPort {
    List<PosProductSnapshot> lockCatalog(List<Long> productIds);
    void lockStock(List<Long> productIds, Long warehouseId);
    List<com.erppos.backend.erp.sales.domain.model.PosProductView> snapshot(List<Long> productIds, Long warehouseId);
}
