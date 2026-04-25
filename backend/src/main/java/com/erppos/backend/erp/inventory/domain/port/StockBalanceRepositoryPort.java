package com.erppos.backend.erp.inventory.domain.port;

import com.erppos.backend.erp.inventory.domain.model.StockBalance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface StockBalanceRepositoryPort {
    StockBalance save(StockBalance stockBalance);
    Optional<StockBalance> findByProductIdAndWarehouseId(Long productId, Long warehouseId);
    Optional<StockBalance> findByProductIdAndWarehouseIdForUpdate(Long productId, Long warehouseId);
    Page<StockBalance> findByFilters(Long productId, Long warehouseId, Pageable pageable);
}

