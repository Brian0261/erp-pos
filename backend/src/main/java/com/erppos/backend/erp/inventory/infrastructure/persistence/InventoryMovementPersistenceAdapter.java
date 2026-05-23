package com.erppos.backend.erp.inventory.infrastructure.persistence;

import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductJpaRepository;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;
import com.erppos.backend.erp.inventory.domain.port.InventoryMovementRepositoryPort;
import com.erppos.backend.erp.inventory.infrastructure.mapper.InventoryMovementMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class InventoryMovementPersistenceAdapter implements InventoryMovementRepositoryPort {

    private static final Instant MIN_INSTANT = Instant.parse("1970-01-01T00:00:00Z");
    private static final Instant MAX_INSTANT_EXCLUSIVE = Instant.parse("9999-12-31T23:59:59Z");

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
    public Page<InventoryMovement> findKardex(Long productId, Long warehouseId, Instant fromInclusive, Instant toExclusive, Pageable pageable) {
        Instant from = fromInclusive == null ? MIN_INSTANT : fromInclusive;
        Instant to = toExclusive == null ? MAX_INSTANT_EXCLUSIVE : toExclusive;

        return inventoryMovementJpaRepository.findKardex(productId, warehouseId, from, to, pageable)
                .map(InventoryMovementMapper::toDomain);
    }
}

