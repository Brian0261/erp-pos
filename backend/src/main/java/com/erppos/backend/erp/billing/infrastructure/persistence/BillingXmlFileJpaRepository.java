package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingXmlFileType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BillingXmlFileJpaRepository extends JpaRepository<BillingXmlFileEntity, Long> {
    Optional<BillingXmlFileEntity> findByElectronicDocument_IdAndFileType(Long electronicDocumentId, BillingXmlFileType fileType);
}


