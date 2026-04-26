package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;

import java.util.List;

public interface ElectronicDocumentStatusHistoryRepositoryPort {
    ElectronicDocumentStatusHistory save(ElectronicDocumentStatusHistory history);
    List<ElectronicDocumentStatusHistory> findByElectronicDocumentId(Long documentId);
}

