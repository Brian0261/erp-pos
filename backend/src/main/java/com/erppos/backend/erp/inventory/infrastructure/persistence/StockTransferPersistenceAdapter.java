package com.erppos.backend.erp.inventory.infrastructure.persistence;

import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductJpaRepository;
import com.erppos.backend.erp.inventory.domain.model.StockTransfer;
import com.erppos.backend.erp.inventory.domain.model.StockTransferItem;
import com.erppos.backend.erp.inventory.domain.port.StockTransferRepositoryPort;
import com.erppos.backend.erp.inventory.infrastructure.mapper.StockTransferMapper;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class StockTransferPersistenceAdapter implements StockTransferRepositoryPort {

    private final StockTransferJpaRepository stockTransferJpaRepository;
    private final StockTransferItemJpaRepository stockTransferItemJpaRepository;
    private final WarehouseJpaRepository warehouseJpaRepository;
    private final ProductJpaRepository productJpaRepository;

    public StockTransferPersistenceAdapter(
            StockTransferJpaRepository stockTransferJpaRepository,
            StockTransferItemJpaRepository stockTransferItemJpaRepository,
            WarehouseJpaRepository warehouseJpaRepository,
            ProductJpaRepository productJpaRepository
    ) {
        this.stockTransferJpaRepository = stockTransferJpaRepository;
        this.stockTransferItemJpaRepository = stockTransferItemJpaRepository;
        this.warehouseJpaRepository = warehouseJpaRepository;
        this.productJpaRepository = productJpaRepository;
    }

    @Override
    public StockTransfer saveTransfer(StockTransfer transfer) {
        WarehouseEntity source = warehouseJpaRepository.findById(transfer.sourceWarehouseId())
                .orElseThrow(() -> new CatalogNotFoundException("Source warehouse not found"));
        WarehouseEntity target = warehouseJpaRepository.findById(transfer.targetWarehouseId())
                .orElseThrow(() -> new CatalogNotFoundException("Target warehouse not found"));

        StockTransferEntity entity = StockTransferMapper.toEntity(transfer, source, target);
        return StockTransferMapper.toDomain(stockTransferJpaRepository.save(entity));
    }

    @Override
    public void saveItems(List<StockTransferItem> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        StockTransferEntity transferEntity = stockTransferJpaRepository.findById(items.get(0).transferId())
                .orElseThrow(() -> new CatalogNotFoundException("Transfer not found"));

        List<StockTransferItemEntity> entities = items.stream().map(item -> {
            ProductEntity productEntity = productJpaRepository.findById(item.productId())
                    .orElseThrow(() -> new CatalogNotFoundException("Product not found"));
            return StockTransferMapper.toItemEntity(item, transferEntity, productEntity);
        }).toList();
        stockTransferItemJpaRepository.saveAll(entities);
    }
}

