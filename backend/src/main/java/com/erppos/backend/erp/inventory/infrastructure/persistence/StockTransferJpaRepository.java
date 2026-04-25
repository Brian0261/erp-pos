package com.erppos.backend.erp.inventory.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StockTransferJpaRepository extends JpaRepository<StockTransferEntity, Long> {
}

