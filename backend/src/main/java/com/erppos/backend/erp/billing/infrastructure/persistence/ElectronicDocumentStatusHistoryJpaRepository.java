package com.erppos.backend.erp.billing.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ElectronicDocumentStatusHistoryJpaRepository extends JpaRepository<ElectronicDocumentStatusHistoryEntity, Long> {
    List<ElectronicDocumentStatusHistoryEntity> findByElectronicDocument_IdOrderByChangedAtAsc(Long electronicDocumentId);
}


