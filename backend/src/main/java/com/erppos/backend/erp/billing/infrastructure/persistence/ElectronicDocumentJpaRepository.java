package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface ElectronicDocumentJpaRepository extends JpaRepository<ElectronicDocumentEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from ElectronicDocumentEntity d where d.id = :id")
    java.util.Optional<ElectronicDocumentEntity> findByIdForUpdate(Long id);

    @Query("""
            select d from ElectronicDocumentEntity d
            where (:status is null or d.status = :status)
              and (:type is null or d.documentType = :type)
              and (:saleId is null or d.saleId = :saleId)
              and d.createdAt >= :fromInstant
              and d.createdAt <= :toInstant
            order by d.createdAt desc
            """)
    List<ElectronicDocumentEntity> findByFilters(
            ElectronicDocumentStatus status,
            ElectronicDocumentType type,
            Long saleId,
            Instant fromInstant,
            Instant toInstant
    );

    @Query("""
            select count(d) > 0
            from ElectronicDocumentEntity d
            where d.saleId = :saleId
            """)
    boolean existsBySaleId(Long saleId);

    @Query("""
            select max(d.number)
            from ElectronicDocumentEntity d
            where d.billingSeries.id = :billingSeriesId
            """)
    Long findMaxNumberByBillingSeriesId(Long billingSeriesId);

    @Query("""
            select d.saleId as saleId,
                   d.id as documentId,
                   d.documentType as documentType,
                   d.fullNumber as fullNumber,
                   d.status as status,
                   d.environment as environment,
                   d.createdAt as createdAt
            from ElectronicDocumentEntity d
            where d.saleId in :saleIds
            order by d.saleId asc, d.createdAt desc, d.id desc
            """)
    List<ElectronicDocumentSalesSummaryProjection> findSalesSummariesBySaleIds(@Param("saleIds") Collection<Long> saleIds);
}

