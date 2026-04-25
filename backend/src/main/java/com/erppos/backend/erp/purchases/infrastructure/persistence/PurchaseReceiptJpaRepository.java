package com.erppos.backend.erp.purchases.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PurchaseReceiptJpaRepository extends JpaRepository<PurchaseReceiptEntity, Long> {

    @Query("""
            SELECT CASE WHEN COUNT(pr) > 0 THEN TRUE ELSE FALSE END
            FROM PurchaseReceiptEntity pr
            WHERE pr.purchaseOrder.id = :purchaseOrderId
            """)
    boolean existsByPurchaseOrderId(@Param("purchaseOrderId") Long purchaseOrderId);
}

