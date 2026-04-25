package com.erppos.backend.erp.inventory.infrastructure.persistence;

import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductJpaRepository;
import com.erppos.backend.erp.inventory.domain.model.StockBalance;
import com.erppos.backend.erp.inventory.domain.port.StockBalanceRepositoryPort;
import com.erppos.backend.erp.inventory.infrastructure.mapper.StockBalanceMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class StockBalancePersistenceAdapter implements StockBalanceRepositoryPort {

    private final StockBalanceJpaRepository stockBalanceJpaRepository;
    private final ProductJpaRepository productJpaRepository;
    private final WarehouseJpaRepository warehouseJpaRepository;

    public StockBalancePersistenceAdapter(
            StockBalanceJpaRepository stockBalanceJpaRepository,
            ProductJpaRepository productJpaRepository,
            WarehouseJpaRepository warehouseJpaRepository
    ) {
        this.stockBalanceJpaRepository = stockBalanceJpaRepository;
        this.productJpaRepository = productJpaRepository;
        this.warehouseJpaRepository = warehouseJpaRepository;
    }

    @Override
    public StockBalance save(StockBalance stockBalance) {
        ProductEntity product = productJpaRepository.findById(stockBalance.productId())
                .orElseThrow(() -> new CatalogNotFoundException("Product not found"));
        WarehouseEntity warehouse = warehouseJpaRepository.findById(stockBalance.warehouseId())
                .orElseThrow(() -> new CatalogNotFoundException("Warehouse not found"));

        StockBalanceEntity entity;
        if (stockBalance.id() == null) {
            entity = StockBalanceMapper.toEntity(stockBalance, product, warehouse);
        } else {
            entity = stockBalanceJpaRepository.findById(stockBalance.id()).orElseGet(StockBalanceEntity::new);
            StockBalanceMapper.merge(entity, stockBalance, product, warehouse);
        }
        return StockBalanceMapper.toDomain(stockBalanceJpaRepository.save(entity));
    }

    @Override
    public Optional<StockBalance> findByProductIdAndWarehouseId(Long productId, Long warehouseId) {
        return stockBalanceJpaRepository.findByProductAndWarehouse(productId, warehouseId).map(StockBalanceMapper::toDomain);
    }

    @Override
    public Optional<StockBalance> findByProductIdAndWarehouseIdForUpdate(Long productId, Long warehouseId) {
        return stockBalanceJpaRepository.findByProductAndWarehouseForUpdate(productId, warehouseId).map(StockBalanceMapper::toDomain);
    }

    @Override
    public Page<StockBalance> findByFilters(Long productId, Long warehouseId, Pageable pageable) {
        return stockBalanceJpaRepository.findByFilters(productId, warehouseId, pageable).map(StockBalanceMapper::toDomain);
    }
}

