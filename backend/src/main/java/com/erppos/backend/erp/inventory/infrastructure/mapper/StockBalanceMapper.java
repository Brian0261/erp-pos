package com.erppos.backend.erp.inventory.infrastructure.mapper;

import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.inventory.domain.model.StockBalance;
import com.erppos.backend.erp.inventory.infrastructure.persistence.StockBalanceEntity;
import com.erppos.backend.erp.inventory.infrastructure.persistence.WarehouseEntity;

public final class StockBalanceMapper {
    private StockBalanceMapper() {
    }

    public static StockBalance toDomain(StockBalanceEntity entity) {
        return new StockBalance(
                entity.getId(),
                entity.getProduct().getId(),
                entity.getWarehouse().getId(),
                entity.getQuantity(),
                entity.getVersion(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static StockBalanceEntity toEntity(StockBalance stockBalance, ProductEntity product, WarehouseEntity warehouse) {
        StockBalanceEntity entity = new StockBalanceEntity();
        merge(entity, stockBalance, product, warehouse);
        return entity;
    }

    public static void merge(StockBalanceEntity entity, StockBalance stockBalance, ProductEntity product, WarehouseEntity warehouse) {
        entity.setProduct(product);
        entity.setWarehouse(warehouse);
        entity.setQuantity(stockBalance.quantity());
    }
}

