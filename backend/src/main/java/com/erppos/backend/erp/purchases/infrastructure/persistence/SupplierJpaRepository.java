package com.erppos.backend.erp.purchases.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupplierJpaRepository extends JpaRepository<SupplierEntity, Long> {
    boolean existsByDocumentNumber(String documentNumber);
    boolean existsByDocumentNumberAndIdNot(String documentNumber, Long id);

    @Query("""
            SELECT s FROM SupplierEntity s
            WHERE (:query IS NULL OR :query = ''
               OR LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%'))
               OR (s.documentNumber IS NOT NULL AND LOWER(s.documentNumber) LIKE LOWER(CONCAT('%', :query, '%'))))
            ORDER BY s.name ASC
            """)
    List<SupplierEntity> findByQuery(@Param("query") String query);
}

