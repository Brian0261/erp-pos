package com.erppos.backend.erp.inventory.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface StockBalanceJpaRepository extends JpaRepository<StockBalanceEntity, Long> {

    @Query(value = """
            SELECT sb FROM StockBalanceEntity sb
            JOIN FETCH sb.product
            JOIN FETCH sb.warehouse
            WHERE sb.product.id = :productId AND sb.warehouse.id = :warehouseId
            """)
    Optional<StockBalanceEntity> findByProductAndWarehouse(@Param("productId") Long productId, @Param("warehouseId") Long warehouseId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(value = """
            SELECT sb FROM StockBalanceEntity sb
            JOIN FETCH sb.product
            JOIN FETCH sb.warehouse
            WHERE sb.product.id = :productId AND sb.warehouse.id = :warehouseId
            """)
    Optional<StockBalanceEntity> findByProductAndWarehouseForUpdate(@Param("productId") Long productId, @Param("warehouseId") Long warehouseId);

    @Query(value = """
            SELECT sb FROM StockBalanceEntity sb
            JOIN FETCH sb.product
            JOIN FETCH sb.warehouse
            WHERE (:productId IS NULL OR sb.product.id = :productId)
              AND (:warehouseId IS NULL OR sb.warehouse.id = :warehouseId)
            """,
            countQuery = """
            SELECT COUNT(sb) FROM StockBalanceEntity sb
            WHERE (:productId IS NULL OR sb.product.id = :productId)
              AND (:warehouseId IS NULL OR sb.warehouse.id = :warehouseId)
            """)
    Page<StockBalanceEntity> findByFilters(@Param("productId") Long productId,
                                           @Param("warehouseId") Long warehouseId,
                                           Pageable pageable);
}

