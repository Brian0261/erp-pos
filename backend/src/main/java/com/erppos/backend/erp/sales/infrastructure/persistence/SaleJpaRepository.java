package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.model.SaleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

public interface SaleJpaRepository extends JpaRepository<SaleEntity, Long> {

    @Query("""
            SELECT s FROM SaleEntity s
            JOIN FETCH s.cashRegisterSession
            WHERE (:fromDate IS NULL OR s.soldAt >= :fromInstant)
              AND (:toDate IS NULL OR s.soldAt < :toExclusiveInstant)
              AND (:cashRegisterSessionId IS NULL OR s.cashRegisterSession.id = :cashRegisterSessionId)
              AND (:status IS NULL OR s.status = :status)
              AND (:createdBy IS NULL OR s.createdBy = :createdBy)
            ORDER BY s.soldAt DESC, s.id DESC
            """)
    List<SaleEntity> findByFilters(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("fromInstant") Instant fromInstant,
            @Param("toExclusiveInstant") Instant toExclusiveInstant,
            @Param("cashRegisterSessionId") Long cashRegisterSessionId,
            @Param("status") SaleStatus status,
            @Param("createdBy") String createdBy
    );

    default List<SaleEntity> findByFiltersWithDate(LocalDate from, LocalDate to, Long cashRegisterSessionId, SaleStatus status, String createdBy) {
        Instant fromInstant = from == null ? null : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant toExclusive = to == null ? null : to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return findByFilters(from, to, fromInstant, toExclusive, cashRegisterSessionId, status, createdBy);
    }
}

