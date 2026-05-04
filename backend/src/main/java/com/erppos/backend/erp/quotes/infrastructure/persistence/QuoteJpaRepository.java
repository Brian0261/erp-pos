package com.erppos.backend.erp.quotes.infrastructure.persistence;

import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface QuoteJpaRepository extends JpaRepository<QuoteEntity, Long> {

    boolean existsByQuoteNumber(String quoteNumber);

    @Override
    @EntityGraph(attributePaths = {"items"})
    Optional<QuoteEntity> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"items"})
    @Query("select q from QuoteEntity q where q.id = :id")
    Optional<QuoteEntity> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT DISTINCT q FROM QuoteEntity q
            LEFT JOIN FETCH q.items
            WHERE (:status IS NULL OR q.status = :status)
              AND (:customerQuery IS NULL OR :customerQuery = ''
                    OR LOWER(q.customerName) LIKE LOWER(CONCAT('%', :customerQuery, '%'))
                    OR (q.customerDocument IS NOT NULL AND LOWER(q.customerDocument) LIKE LOWER(CONCAT('%', :customerQuery, '%'))))
              AND (:from IS NULL OR q.issueDate >= :from)
              AND (:to IS NULL OR q.issueDate <= :to)
            ORDER BY q.issueDate DESC, q.id DESC
            """)
    List<QuoteEntity> findByFilters(
            @Param("status") QuoteStatus status,
            @Param("customerQuery") String customerQuery,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}

