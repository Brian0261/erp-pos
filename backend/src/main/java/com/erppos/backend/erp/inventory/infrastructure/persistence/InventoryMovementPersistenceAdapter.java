package com.erppos.backend.erp.inventory.infrastructure.persistence;

import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductJpaRepository;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;
import com.erppos.backend.erp.inventory.domain.port.InventoryMovementRepositoryPort;
import com.erppos.backend.erp.inventory.infrastructure.mapper.InventoryMovementMapper;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class InventoryMovementPersistenceAdapter implements InventoryMovementRepositoryPort {

    private final InventoryMovementJpaRepository inventoryMovementJpaRepository;
    private final ProductJpaRepository productJpaRepository;
    private final WarehouseJpaRepository warehouseJpaRepository;

    public InventoryMovementPersistenceAdapter(
            InventoryMovementJpaRepository inventoryMovementJpaRepository,
            ProductJpaRepository productJpaRepository,
            WarehouseJpaRepository warehouseJpaRepository
    ) {
        this.inventoryMovementJpaRepository = inventoryMovementJpaRepository;
        this.productJpaRepository = productJpaRepository;
        this.warehouseJpaRepository = warehouseJpaRepository;
    }

    @Override
    public InventoryMovement save(InventoryMovement movement) {
        ProductEntity product = productJpaRepository.findById(movement.productId())
                .orElseThrow(() -> new CatalogNotFoundException("Product not found"));
        WarehouseEntity warehouse = warehouseJpaRepository.findById(movement.warehouseId())
                .orElseThrow(() -> new CatalogNotFoundException("Warehouse not found"));
        InventoryMovementEntity entity = InventoryMovementMapper.toEntity(movement, product, warehouse);
        return InventoryMovementMapper.toDomain(inventoryMovementJpaRepository.save(entity));
    }

    @Override
    public boolean existsByProductIdAndWarehouseId(Long productId, Long warehouseId) {
        return inventoryMovementJpaRepository.existsByProductIdAndWarehouseId(productId, warehouseId);
    }

    @Override
    public List<InventoryMovement> findKardex(Long productId, Long warehouseId, Instant fromInclusive, Instant toExclusive) {
        return inventoryMovementJpaRepository.findKardex(productId, warehouseId, fromInclusive, toExclusive)
                .stream()
                .map(InventoryMovementMapper::toDomain)
                .toList();
    }
}

