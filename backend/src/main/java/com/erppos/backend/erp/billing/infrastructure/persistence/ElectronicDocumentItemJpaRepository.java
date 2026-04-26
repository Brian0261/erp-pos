package com.erppos.backend.erp.billing.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ElectronicDocumentItemJpaRepository extends JpaRepository<ElectronicDocumentItemEntity, Long> {
    List<ElectronicDocumentItemEntity> findByElectronicDocument_IdOrderByIdAsc(Long electronicDocumentId);
    void deleteByElectronicDocument_Id(Long electronicDocumentId);
}


