package com.erppos.backend.erp.inventory.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;

public interface InventoryMovementJpaRepository extends JpaRepository<InventoryMovementEntity, Long> {

    @Query("""
            SELECT CASE WHEN COUNT(m) > 0 THEN TRUE ELSE FALSE END
            FROM InventoryMovementEntity m
            WHERE m.product.id = :productId AND m.warehouse.id = :warehouseId
            """)
    boolean existsByProductIdAndWarehouseId(@Param("productId") Long productId, @Param("warehouseId") Long warehouseId);

    @Query(value = """
            SELECT m FROM InventoryMovementEntity m
            WHERE (:productId IS NULL OR m.product.id = :productId)
              AND (:warehouseId IS NULL OR m.warehouse.id = :warehouseId)
              AND m.createdAt >= :fromInclusive
              AND m.createdAt < :toExclusive
            ORDER BY m.createdAt DESC, m.id DESC
            """,
            countQuery = """
            SELECT COUNT(m) FROM InventoryMovementEntity m
            WHERE (:productId IS NULL OR m.product.id = :productId)
              AND (:warehouseId IS NULL OR m.warehouse.id = :warehouseId)
              AND m.createdAt >= :fromInclusive
              AND m.createdAt < :toExclusive
            """)
    Page<InventoryMovementEntity> findKardex(@Param("productId") Long productId,
                                             @Param("warehouseId") Long warehouseId,
                                             @Param("fromInclusive") Instant fromInclusive,
                                             @Param("toExclusive") Instant toExclusive,
                                             Pageable pageable);
}

