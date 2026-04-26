package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;

import java.util.List;
import java.util.Optional;

public interface BillingSeriesRepositoryPort {
    BillingSeries save(BillingSeries series);
    Optional<BillingSeries> findById(Long id);
    Optional<BillingSeries> findByIdForUpdate(Long id);
    List<BillingSeries> findAll();
    boolean existsByDocumentTypeAndSeriesAndEnvironment(ElectronicDocumentType type, String series, BillingEnvironment environment, Long excludeId);
}

