package com.erppos.backend.erp.inventory.adapter.rest;

import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductEntity;
import com.erppos.backend.erp.catalog.infrastructure.persistence.ProductJpaRepository;
import com.erppos.backend.erp.inventory.adapter.dto.InventoryMovementResponse;
import com.erppos.backend.erp.inventory.domain.model.InventoryMovement;
import com.erppos.backend.erp.inventory.infrastructure.persistence.WarehouseEntity;
import com.erppos.backend.erp.inventory.infrastructure.persistence.WarehouseJpaRepository;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class InventoryMovementResponseAssembler {

    private final ProductJpaRepository productJpaRepository;
    private final WarehouseJpaRepository warehouseJpaRepository;

    public InventoryMovementResponseAssembler(ProductJpaRepository productJpaRepository,
                                             WarehouseJpaRepository warehouseJpaRepository) {
        this.productJpaRepository = productJpaRepository;
        this.warehouseJpaRepository = warehouseJpaRepository;
    }

    public List<InventoryMovementResponse> toResponses(List<InventoryMovement> movements) {
        Set<Long> productIds = movements.stream().map(InventoryMovement::productId).collect(Collectors.toSet());
        Set<Long> warehouseIds = movements.stream().map(InventoryMovement::warehouseId).collect(Collectors.toSet());

        Map<Long, ProductEntity> productsById = loadProducts(productIds);
        Map<Long, WarehouseEntity> warehousesById = loadWarehouses(warehouseIds);

        return movements.stream()
                .map(movement -> toResponse(movement, productsById.get(movement.productId()), warehousesById.get(movement.warehouseId())))
                .toList();
    }

    private Map<Long, ProductEntity> loadProducts(Collection<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }

        return productJpaRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(ProductEntity::getId, Function.identity(), (left, right) -> left, HashMap::new));
    }

    private Map<Long, WarehouseEntity> loadWarehouses(Collection<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }

        return warehouseJpaRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(WarehouseEntity::getId, Function.identity(), (left, right) -> left, HashMap::new));
    }

    private InventoryMovementResponse toResponse(InventoryMovement movement,
                                                 ProductEntity product,
                                                 WarehouseEntity warehouse) {
        return new InventoryMovementResponse(
                movement.id(),
                movement.productId(),
                product != null ? product.getName() : null,
                product != null ? product.getSku() : null,
                product != null ? product.getBarcode() : null,
                movement.warehouseId(),
                warehouse != null ? warehouse.getName() : null,
                warehouse != null ? warehouse.getCode() : null,
                movement.movementType(),
                movement.quantity(),
                movement.previousStock(),
                movement.newStock(),
                movement.reason(),
                movement.referenceType(),
                movement.referenceId(),
                movement.createdAt(),
                movement.createdBy()
        );
    }
}
