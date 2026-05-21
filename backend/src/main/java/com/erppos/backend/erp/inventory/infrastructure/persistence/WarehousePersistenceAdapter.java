package com.erppos.backend.erp.inventory.infrastructure.persistence;

import com.erppos.backend.erp.inventory.domain.model.Warehouse;
import com.erppos.backend.erp.inventory.domain.port.WarehouseRepositoryPort;
import com.erppos.backend.erp.inventory.infrastructure.mapper.WarehouseMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class WarehousePersistenceAdapter implements WarehouseRepositoryPort {

    private final WarehouseJpaRepository warehouseJpaRepository;

    public WarehousePersistenceAdapter(WarehouseJpaRepository warehouseJpaRepository) {
        this.warehouseJpaRepository = warehouseJpaRepository;
    }

    @Override
    public Warehouse save(Warehouse warehouse) {
        WarehouseEntity entity;
        if (warehouse.id() == null) {
            entity = WarehouseMapper.toEntity(warehouse);
        } else {
            entity = warehouseJpaRepository.findById(warehouse.id()).orElseGet(WarehouseEntity::new);
            WarehouseMapper.merge(entity, warehouse);
        }
        return WarehouseMapper.toDomain(warehouseJpaRepository.save(entity));
    }

    @Override
    public boolean existsByCodeIgnoreCase(String code) {
        return warehouseJpaRepository.existsByCodeIgnoreCase(code);
    }

    @Override
    public boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id) {
        return warehouseJpaRepository.existsByCodeIgnoreCaseAndIdNot(code, id);
    }

    @Override
    public List<Warehouse> findAll() {
        return warehouseJpaRepository.findAllByOrderByNameAsc().stream().map(WarehouseMapper::toDomain).toList();
    }

    @Override
    public List<Warehouse> findActive() {
        return warehouseJpaRepository.findByActiveTrueOrderByNameAsc().stream().map(WarehouseMapper::toDomain).toList();
    }

    @Override
    public Optional<Warehouse> findById(Long id) {
        return warehouseJpaRepository.findById(id).map(WarehouseMapper::toDomain);
    }
}

