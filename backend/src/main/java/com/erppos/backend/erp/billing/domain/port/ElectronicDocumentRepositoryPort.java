package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ElectronicDocumentRepositoryPort {
    ElectronicDocument save(ElectronicDocument document);
    Optional<ElectronicDocument> findById(Long id);
    List<ElectronicDocument> findByFilters(ElectronicDocumentStatus status, ElectronicDocumentType type, Long saleId, LocalDate from, LocalDate to);
    boolean existsBySaleId(Long saleId);
    Optional<Long> findMaxIssuedNumberByBillingSeriesId(Long billingSeriesId);
}

