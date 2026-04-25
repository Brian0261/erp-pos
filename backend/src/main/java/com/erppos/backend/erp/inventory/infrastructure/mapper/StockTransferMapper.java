package com.erppos.backend.erp.inventory.infrastructure.mapper;

import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.inventory.domain.model.StockTransfer;
import com.erppos.backend.erp.inventory.domain.model.StockTransferItem;
import com.erppos.backend.erp.inventory.infrastructure.persistence.StockTransferEntity;
import com.erppos.backend.erp.inventory.infrastructure.persistence.StockTransferItemEntity;
import com.erppos.backend.erp.inventory.infrastructure.persistence.WarehouseEntity;

public final class StockTransferMapper {
    private StockTransferMapper() {
    }

    public static StockTransfer toDomain(StockTransferEntity entity) {
        return new StockTransfer(
                entity.getId(),
                entity.getSourceWarehouse().getId(),
                entity.getTargetWarehouse().getId(),
                entity.getStatus(),
                entity.getReason(),
                entity.getCreatedAt(),
                entity.getCreatedBy()
        );
    }

    public static StockTransferEntity toEntity(StockTransfer transfer, WarehouseEntity source, WarehouseEntity target) {
        StockTransferEntity entity = new StockTransferEntity();
        entity.setSourceWarehouse(source);
        entity.setTargetWarehouse(target);
        entity.setStatus(transfer.status());
        entity.setReason(transfer.reason());
        entity.setCreatedBy(transfer.createdBy());
        return entity;
    }

    public static StockTransferItemEntity toItemEntity(StockTransferItem item, StockTransferEntity transferEntity, ProductEntity productEntity) {
        StockTransferItemEntity entity = new StockTransferItemEntity();
        entity.setTransfer(transferEntity);
        entity.setProduct(productEntity);
        entity.setQuantity(item.quantity());
        return entity;
    }
}

