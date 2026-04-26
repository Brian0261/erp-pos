package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;

import java.util.List;

public interface ElectronicDocumentItemRepositoryPort {
    List<ElectronicDocumentItem> saveAll(Long documentId, List<ElectronicDocumentItem> items);
    List<ElectronicDocumentItem> findByElectronicDocumentId(Long documentId);
}

