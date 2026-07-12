package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceAvailabilityStatus;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceIntegrityStatus;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadiness;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadinessItem;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadinessReasonCode;
import com.erppos.backend.erp.billing.application.usecase.FiscalEvidenceReadinessUseCase;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentEvidence;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceMetadataStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageProvider;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentEvidenceRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class FiscalEvidenceReadinessApplicationService implements FiscalEvidenceReadinessUseCase {

    private final ElectronicDocumentRepositoryPort documentRepositoryPort;
    private final ElectronicDocumentEvidenceRepositoryPort evidenceRepositoryPort;

    public FiscalEvidenceReadinessApplicationService(
            ElectronicDocumentRepositoryPort documentRepositoryPort,
            ElectronicDocumentEvidenceRepositoryPort evidenceRepositoryPort
    ) {
        this.documentRepositoryPort = documentRepositoryPort;
        this.evidenceRepositoryPort = evidenceRepositoryPort;
    }

    @Override
    @Transactional(readOnly = true)
    public FiscalEvidenceReadiness getByDocumentId(Long documentId) {
        ElectronicDocument document = documentRepositoryPort.findById(documentId)
                .orElseThrow(() -> new BillingNotFoundException("Electronic document not found"));
        List<ElectronicDocumentEvidence> evidence = evidenceRepositoryPort.findByElectronicDocumentId(documentId);
        List<FiscalEvidenceReadinessItem> items = evidence.stream().map(this::toReadinessItem).toList();
        Instant lastUpdatedAt = evidence.stream()
                .map(ElectronicDocumentEvidence::createdAt)
                .filter(value -> value != null)
                .max(Comparator.naturalOrder())
                .orElse(null);
        return new FiscalEvidenceReadiness(
                document.id(),
                document.environment() != BillingEnvironment.PROD,
                items.size(),
                lastUpdatedAt,
                items
        );
    }

    private FiscalEvidenceReadinessItem toReadinessItem(ElectronicDocumentEvidence evidence) {
        FiscalEvidenceAvailabilityStatus availabilityStatus = availabilityStatus(evidence);
        return new FiscalEvidenceReadinessItem(
                evidence.id(),
                evidence.evidenceType(),
                availabilityStatus,
                integrityStatus(evidence, availabilityStatus),
                false,
                reasonCode(evidence, availabilityStatus),
                List.of()
        );
    }

    private FiscalEvidenceAvailabilityStatus availabilityStatus(ElectronicDocumentEvidence evidence) {
        return switch (evidence.metadataStatus()) {
            case AVAILABLE -> FiscalEvidenceAvailabilityStatus.AVAILABLE;
            case MISSING -> FiscalEvidenceAvailabilityStatus.MISSING;
            case REVOKED -> FiscalEvidenceAvailabilityStatus.REVOKED;
            case REGISTERED -> FiscalEvidenceAvailabilityStatus.NOT_READY;
        };
    }

    private FiscalEvidenceIntegrityStatus integrityStatus(
            ElectronicDocumentEvidence evidence,
            FiscalEvidenceAvailabilityStatus availabilityStatus
    ) {
        if (availabilityStatus == FiscalEvidenceAvailabilityStatus.MISSING
                || availabilityStatus == FiscalEvidenceAvailabilityStatus.REVOKED
                || evidence.storageProvider() == FiscalEvidenceStorageProvider.NONE) {
            return FiscalEvidenceIntegrityStatus.NOT_APPLICABLE;
        }
        return FiscalEvidenceIntegrityStatus.NOT_VERIFIED;
    }

    private FiscalEvidenceReadinessReasonCode reasonCode(
            ElectronicDocumentEvidence evidence,
            FiscalEvidenceAvailabilityStatus availabilityStatus
    ) {
        return switch (availabilityStatus) {
            case AVAILABLE -> FiscalEvidenceReadinessReasonCode.EVIDENCE_AVAILABLE;
            case MISSING -> FiscalEvidenceReadinessReasonCode.EVIDENCE_MISSING;
            case REVOKED -> FiscalEvidenceReadinessReasonCode.EVIDENCE_REVOKED;
            case NOT_READY -> evidence.storageProvider() == FiscalEvidenceStorageProvider.NONE
                    ? FiscalEvidenceReadinessReasonCode.EVIDENCE_NOT_MATERIALIZED
                    : FiscalEvidenceReadinessReasonCode.EVIDENCE_NOT_READY;
            case REGISTERED, CORRUPTED -> FiscalEvidenceReadinessReasonCode.EVIDENCE_NOT_READY;
        };
    }
}
