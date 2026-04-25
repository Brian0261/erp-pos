package com.erppos.backend.erp.purchases.infrastructure.persistence;

import com.erppos.backend.erp.purchases.domain.model.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PurchaseOrderJpaRepository extends JpaRepository<PurchaseOrderEntity, Long> {

    @Override
    @EntityGraph(attributePaths = {"supplier", "items"})
    Optional<PurchaseOrderEntity> findById(Long id);

    @Query("""
            SELECT DISTINCT po FROM PurchaseOrderEntity po
            LEFT JOIN FETCH po.items i
            JOIN FETCH po.supplier
            WHERE (:status IS NULL OR po.status = :status)
              AND (:supplierId IS NULL OR po.supplier.id = :supplierId)
              AND (:from IS NULL OR po.orderDate >= :from)
              AND (:to IS NULL OR po.orderDate <= :to)
            ORDER BY po.orderDate DESC, po.id DESC
            """)
    List<PurchaseOrderEntity> findByFilters(
            @Param("status") PurchaseOrderStatus status,
            @Param("supplierId") Long supplierId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}
