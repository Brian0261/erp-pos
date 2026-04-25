package com.erppos.backend.erp.inventory.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WarehouseJpaRepository extends JpaRepository<WarehouseEntity, Long> {
    boolean existsByCodeIgnoreCase(String code);
    List<WarehouseEntity> findAllByOrderByNameAsc();
    List<WarehouseEntity> findByActiveTrueOrderByNameAsc();
}

