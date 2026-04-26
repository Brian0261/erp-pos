package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface BillingSeriesJpaRepository extends JpaRepository<BillingSeriesEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from BillingSeriesEntity s where s.id = :id")
    Optional<BillingSeriesEntity> findByIdForUpdate(Long id);

    @Query("""
            select count(s) > 0
            from BillingSeriesEntity s
            where s.documentType = :type
              and lower(s.series) = lower(:series)
              and s.environment = :environment
              and (:excludeId is null or s.id <> :excludeId)
            """)
    boolean existsByTypeSeriesEnvironment(ElectronicDocumentType type, String series, BillingEnvironment environment, Long excludeId);
}

