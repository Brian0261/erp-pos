package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.shared.domain.policy.CommercialDates;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SaleJpaRepository extends JpaRepository<SaleEntity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SaleEntity s where s.id = :id")
    Optional<SaleEntity> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT s FROM SaleEntity s
            JOIN FETCH s.cashRegisterSession
            WHERE (:hasFrom = false OR s.soldAt >= :fromInstant)
              AND (:hasTo = false OR s.soldAt < :toExclusiveInstant)
              AND (:cashRegisterSessionId IS NULL OR s.cashRegisterSession.id = :cashRegisterSessionId)
              AND (:status IS NULL OR s.status = :status)
              AND (:createdBy IS NULL OR s.createdBy = :createdBy)
            ORDER BY s.soldAt DESC, s.id DESC
            """)
    List<SaleEntity> findByFilters(
            @Param("hasFrom") boolean hasFrom,
            @Param("hasTo") boolean hasTo,
            @Param("fromInstant") Instant fromInstant,
            @Param("toExclusiveInstant") Instant toExclusiveInstant,
            @Param("cashRegisterSessionId") Long cashRegisterSessionId,
            @Param("status") SaleStatus status,
            @Param("createdBy") String createdBy
    );

    default List<SaleEntity> findByFiltersWithDate(LocalDate from, LocalDate to, Long cashRegisterSessionId, SaleStatus status, String createdBy) {
        Instant fromInstant = CommercialDates.start(from);
        Instant toExclusive = CommercialDates.endExclusive(to);
        return findByFilters(from != null, to != null, fromInstant, toExclusive, cashRegisterSessionId, status, createdBy);
    }
}

