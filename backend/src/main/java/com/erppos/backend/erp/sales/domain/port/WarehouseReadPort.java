package com.erppos.backend.erp.sales.domain.port;

public interface WarehouseReadPort {
    boolean existsAndActive(Long warehouseId);
}

