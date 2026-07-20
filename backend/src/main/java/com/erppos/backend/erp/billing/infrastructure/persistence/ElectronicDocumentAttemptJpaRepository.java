package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.FiscalOperation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ElectronicDocumentAttemptJpaRepository extends JpaRepository<ElectronicDocumentAttemptEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from ElectronicDocumentAttemptEntity a where a.id = :id")
    Optional<ElectronicDocumentAttemptEntity> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            select max(a.attemptNumber)
            from ElectronicDocumentAttemptEntity a
            where a.electronicDocument.id = :documentId
              and a.operation = :operation
            """)
    Integer findMaxAttemptNumber(
            @Param("documentId") Long documentId,
            @Param("operation") FiscalOperation operation
    );

    List<ElectronicDocumentAttemptEntity> findByElectronicDocument_IdOrderByAttemptNumberAsc(Long electronicDocumentId);

    Optional<ElectronicDocumentAttemptEntity> findFirstByElectronicDocument_IdAndOperationOrderByAttemptNumberDesc(
            Long electronicDocumentId,
            FiscalOperation operation
    );

    @Query("""
            select a.electronicDocument.id
            from ElectronicDocumentAttemptEntity a
            where a.id = :attemptId
            """)
    Optional<Long> findElectronicDocumentIdById(@Param("attemptId") Long attemptId);
}
