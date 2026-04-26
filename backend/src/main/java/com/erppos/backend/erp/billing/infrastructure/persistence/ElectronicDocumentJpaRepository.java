package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface ElectronicDocumentJpaRepository extends JpaRepository<ElectronicDocumentEntity, Long> {

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
              and d.documentType = :documentType
              and d.status <> com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus.CANCELLED
            """)
    boolean existsBySaleIdAndDocumentType(Long saleId, ElectronicDocumentType documentType);
}

