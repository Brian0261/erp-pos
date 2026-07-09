package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentAttempt;
import com.erppos.backend.erp.billing.domain.model.FiscalOperation;

import java.util.List;
import java.util.Optional;

public interface ElectronicDocumentAttemptRepositoryPort {
    ElectronicDocumentAttempt save(ElectronicDocumentAttempt attempt);
    int nextAttemptNumber(Long electronicDocumentId, FiscalOperation operation);
    List<ElectronicDocumentAttempt> findByElectronicDocumentId(Long electronicDocumentId);
    Optional<ElectronicDocumentAttempt> findLatestByElectronicDocumentIdAndOperation(Long electronicDocumentId, FiscalOperation operation);
}
