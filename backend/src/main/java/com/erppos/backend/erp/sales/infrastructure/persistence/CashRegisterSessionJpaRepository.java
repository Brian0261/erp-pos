package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface CashRegisterSessionJpaRepository extends JpaRepository<CashRegisterSessionEntity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CashRegisterSessionEntity c where c.id = :id")
    Optional<CashRegisterSessionEntity> findByIdForUpdate(@Param("id") Long id);
    Optional<CashRegisterSessionEntity> findByOpenedByUserIdAndStatus(UUID openedByUserId, CashRegisterStatus status);
    Optional<CashRegisterSessionEntity> findFirstByOpenedByUserIdOrderByOpenedAtDesc(UUID openedByUserId);

    @Query("""
            SELECT COALESCE(SUM(s.totalAmount), 0)
            FROM SaleEntity s
            WHERE s.cashRegisterSession.id = :sessionId AND s.status = com.erppos.backend.erp.sales.domain.model.SaleStatus.COMPLETED
            """)
    BigDecimal sumSalesTotal(@Param("sessionId") Long sessionId);

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0)
            FROM SalePaymentEntity p
            WHERE p.sale.cashRegisterSession.id = :sessionId
              AND p.paymentMethod = com.erppos.backend.erp.sales.domain.model.PaymentMethod.CASH
              AND p.sale.status = com.erppos.backend.erp.sales.domain.model.SaleStatus.COMPLETED
            """)
    BigDecimal sumSalesCashPaid(@Param("sessionId") Long sessionId);

    // Sum once per sale, not per CASH payment: a join would multiply change.
    @Query("""
            SELECT COALESCE(SUM(s.changeAmount), 0)
            FROM SaleEntity s
            WHERE s.cashRegisterSession.id = :sessionId
              AND s.status = com.erppos.backend.erp.sales.domain.model.SaleStatus.COMPLETED
            """)
    BigDecimal sumSalesCashChange(@Param("sessionId") Long sessionId);

    @Query("""
            SELECT MIN(s.soldAt)
            FROM SaleEntity s
            WHERE s.cashRegisterSession.id = :sessionId
            """)
    Instant findFirstSaleAt(@Param("sessionId") Long sessionId);

    @Query("""
            SELECT MAX(s.soldAt)
            FROM SaleEntity s
            WHERE s.cashRegisterSession.id = :sessionId
            """)
    Instant findLastSaleAt(@Param("sessionId") Long sessionId);
}

