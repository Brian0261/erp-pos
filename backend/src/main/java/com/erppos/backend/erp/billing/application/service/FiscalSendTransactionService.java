package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFileType;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentAttempt;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentEvidence;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;
import com.erppos.backend.erp.billing.domain.model.FiscalAttemptResult;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceMetadataStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageProvider;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
import com.erppos.backend.erp.billing.domain.model.FiscalErrorCategory;
import com.erppos.backend.erp.billing.domain.model.FiscalOperation;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.port.BillingXmlFileRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentAttemptRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentEvidenceRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentStatusHistoryRepositoryPort;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Service
public class FiscalSendTransactionService {

    private static final String TRACE_ID_MDC_KEY = "traceId";
    private static final String RETRY_RECONCILIATION_MESSAGE =
            "El reenvio fiscal directo esta bloqueado hasta completar consulta o reconciliacion remota.";

    private final ElectronicDocumentRepositoryPort documentRepositoryPort;
    private final ElectronicDocumentAttemptRepositoryPort attemptRepositoryPort;
    private final ElectronicDocumentEvidenceRepositoryPort evidenceRepositoryPort;
    private final ElectronicDocumentStatusHistoryRepositoryPort historyRepositoryPort;
    private final BillingXmlFileRepositoryPort xmlFileRepositoryPort;
    private final BillingRuntimeSafetyPolicy runtimeSafetyPolicy;
    private final ElectronicDocumentLifecyclePolicy lifecyclePolicy;
    private final FiscalAttemptAuditService attemptAuditService;
    private final FiscalAuditSanitizer sanitizer;
    private final AuditUserProvider auditUserProvider;

    public FiscalSendTransactionService(
            ElectronicDocumentRepositoryPort documentRepositoryPort,
            ElectronicDocumentAttemptRepositoryPort attemptRepositoryPort,
            ElectronicDocumentEvidenceRepositoryPort evidenceRepositoryPort,
            ElectronicDocumentStatusHistoryRepositoryPort historyRepositoryPort,
            BillingXmlFileRepositoryPort xmlFileRepositoryPort,
            BillingRuntimeSafetyPolicy runtimeSafetyPolicy,
            ElectronicDocumentLifecyclePolicy lifecyclePolicy,
            FiscalAttemptAuditService attemptAuditService,
            FiscalAuditSanitizer sanitizer,
            AuditUserProvider auditUserProvider
    ) {
        this.documentRepositoryPort = documentRepositoryPort;
        this.attemptRepositoryPort = attemptRepositoryPort;
        this.evidenceRepositoryPort = evidenceRepositoryPort;
        this.historyRepositoryPort = historyRepositoryPort;
        this.xmlFileRepositoryPort = xmlFileRepositoryPort;
        this.runtimeSafetyPolicy = runtimeSafetyPolicy;
        this.lifecyclePolicy = lifecyclePolicy;
        this.attemptAuditService = attemptAuditService;
        this.sanitizer = sanitizer;
        this.auditUserProvider = auditUserProvider;
    }

    @Transactional
    public FiscalSendPreparationOutcome prepareSend(Long documentId) {
        ElectronicDocument current = documentRepositoryPort.findByIdForUpdate(documentId)
                .orElseThrow(() -> new BillingNotFoundException("Electronic document not found"));

        ElectronicDocumentAttempt inFlight = latestInFlightAttempt(current.id());
        if (inFlight != null) {
            String message = "El comprobante ya tiene un attempt SEND pendiente de reconciliacion.";
            recordBlocked(current, categoryOrValidation(inFlight.errorCategory()), message);
            return FiscalSendPreparationOutcome.blocked(FiscalSendFailureType.CONFLICT, message);
        }

        try {
            lifecyclePolicy.assertCanSend(current.status());
            runtimeSafetyPolicy.assertCanSend(current.environment());
        } catch (BillingConflictException ex) {
            recordBlocked(current, blockedCategoryForMessage(ex.getMessage()), ex.getMessage());
            return FiscalSendPreparationOutcome.blocked(FiscalSendFailureType.CONFLICT, ex.getMessage());
        }

        BillingXmlFile signed = xmlFileRepositoryPort
                .findByElectronicDocumentIdAndFileType(current.id(), BillingXmlFileType.SIGNED)
                .orElse(null);
        if (signed == null) {
            String message = "XML firmado no disponible. Firma el XML antes de enviar.";
            recordBlocked(current, FiscalErrorCategory.VALIDATION_ERROR, message);
            return FiscalSendPreparationOutcome.blocked(FiscalSendFailureType.NOT_FOUND, message);
        }

        recordSignedXmlEvidenceIfMissing(current, signed);
        String requestHash = attemptAuditService.hashPayload(signed.content());
        ElectronicDocumentAttempt attempt = attemptAuditService.startSendAttempt(
                current,
                requestHash,
                auditUserProvider.currentUsername(),
                currentTraceId()
        );

        ElectronicDocument sent = copyWithProviderResult(
                current,
                ElectronicDocumentStatus.SENT,
                null,
                null,
                Instant.now()
        );
        ElectronicDocument saved = documentRepositoryPort.save(sent);
        addHistory(saved.id(), current.status(), ElectronicDocumentStatus.SENT, sendTrackingMessage(current.environment()));

        return FiscalSendPreparationOutcome.ready(new FiscalSendPreparation(
                saved,
                attempt.id(),
                requestHash,
                signed.content()
        ));
    }

    @Transactional
    public ElectronicDocument finalizeSend(
            Long documentId,
            Long attemptId,
            String requestHash,
            ProviderSendResult result,
            FiscalProviderResultClassification classification
    ) {
        return finalizeInternal(documentId, attemptId, requestHash, result, classification, null, true);
    }

    @Transactional
    public ElectronicDocument finalizeAmbiguousFailure(
            Long documentId,
            Long attemptId,
            String requestHash,
            FiscalProviderResultClassification classification,
            String message
    ) {
        return finalizeInternal(documentId, attemptId, requestHash, null, classification, message, false);
    }

    @Transactional
    public FiscalSendFailure blockRetry(Long documentId) {
        ElectronicDocument current = documentRepositoryPort.findByIdForUpdate(documentId)
                .orElseThrow(() -> new BillingNotFoundException("Electronic document not found"));
        try {
            runtimeSafetyPolicy.assertCanSend(current.environment());
        } catch (BillingConflictException ex) {
            recordBlocked(current, blockedCategoryForMessage(ex.getMessage()), ex.getMessage());
            return new FiscalSendFailure(FiscalSendFailureType.CONFLICT, ex.getMessage());
        }
        ElectronicDocumentAttempt latest = attemptRepositoryPort
                .findLatestByElectronicDocumentIdAndOperation(current.id(), FiscalOperation.SEND)
                .orElse(null);
        FiscalErrorCategory category = latest == null
                ? FiscalErrorCategory.VALIDATION_ERROR
                : categoryOrValidation(latest.errorCategory());
        recordBlocked(current, category, RETRY_RECONCILIATION_MESSAGE);
        return new FiscalSendFailure(FiscalSendFailureType.CONFLICT, RETRY_RECONCILIATION_MESSAGE);
    }

    private ElectronicDocument finalizeInternal(
            Long documentId,
            Long attemptId,
            String requestHash,
            ProviderSendResult result,
            FiscalProviderResultClassification classification,
            String failureMessage,
            boolean recordEvidence
    ) {
        ElectronicDocumentAttempt attempt = attemptRepositoryPort.findByIdForUpdate(attemptId)
                .orElseThrow(() -> new BillingNotFoundException("Electronic document attempt not found"));
        if (!attempt.electronicDocumentId().equals(documentId)
                || !equal(attempt.requestHash(), requestHash)) {
            throw new BillingConflictException("El attempt SEND no corresponde a la preparacion fiscal.");
        }
        ElectronicDocument current = documentRepositoryPort.findByIdForUpdate(attempt.electronicDocumentId())
                .orElseThrow(() -> new BillingNotFoundException("Electronic document not found"));

        if (attempt.operation() != FiscalOperation.SEND) {
            throw new BillingConflictException("El attempt no corresponde a una operacion SEND.");
        }

        String providerMessage = failureMessage != null
                ? sanitizer.providerMessage(failureMessage)
                : result == null ? null : sanitizer.providerMessage(result.message());
        String providerTicket = result == null ? null : sanitizer.providerTicket(result.ticket());

        if (attempt.result() != FiscalAttemptResult.STARTED) {
            if (matchesAppliedFinalization(attempt, result, classification, providerMessage)
                    && matchesDocumentFinalization(current, classification, providerTicket, providerMessage)) {
                return current;
            }
            throw new BillingConflictException("El attempt SEND ya fue finalizado con un resultado diferente.");
        }
        if (current.status() != ElectronicDocumentStatus.SENT) {
            throw new BillingConflictException("El documento no esta en estado SENT para finalizar el attempt.");
        }

        ElectronicDocumentStatus finalStatus = classification.finalDocumentStatus();
        if (finalStatus != ElectronicDocumentStatus.SENT) {
            lifecyclePolicy.assertTransitionAllowed(current.status(), finalStatus);
        }
        runtimeSafetyPolicy.assertCanAcceptProviderResult(current.environment(), finalStatus);

        ElectronicDocument finalized = copyWithProviderResult(
                current,
                finalStatus,
                providerTicket,
                providerMessage,
                current.sentAt() == null ? Instant.now() : current.sentAt()
        );
        ElectronicDocument saved = documentRepositoryPort.save(finalized);
        if (finalStatus != ElectronicDocumentStatus.SENT) {
            addHistory(saved.id(), ElectronicDocumentStatus.SENT, finalStatus, providerMessage);
        }

        ElectronicDocumentAttempt finishedAttempt = failureMessage == null
                ? attemptAuditService.finishSendAttempt(attempt, result, classification)
                : attemptAuditService.failSendAttempt(attempt, classification, failureMessage);
        if (recordEvidence) {
            recordProviderResponseEvidenceIfMissing(saved, finishedAttempt, result, classification);
        }
        return saved;
    }

    private boolean matchesAppliedFinalization(
            ElectronicDocumentAttempt attempt,
            ProviderSendResult result,
            FiscalProviderResultClassification classification,
            String providerMessage
    ) {
        String expectedStatus = classification.providerStatus() == null
                ? null
                : sanitizer.providerCode(classification.providerStatus().name());
        String expectedCode = result == null ? null : sanitizer.providerCode(result.providerCode());
        String expectedTicket = result == null ? null : sanitizer.providerTicket(result.ticket());
        String expectedCorrelation = result == null
                ? null
                : sanitizer.providerCorrelationId(result.providerCorrelationId());
        return attempt.result() == classification.attemptResult()
                && attempt.errorCategory() == classification.errorCategory()
                && attempt.recoverable() == classification.recoverable()
                && equal(attempt.providerStatus(), expectedStatus)
                && equal(attempt.providerCode(), expectedCode)
                && equal(attempt.providerMessage(), providerMessage)
                && equal(attempt.providerTicket(), expectedTicket)
                && equal(attempt.providerCorrelationId(), expectedCorrelation);
    }

    private boolean matchesDocumentFinalization(
            ElectronicDocument document,
            FiscalProviderResultClassification classification,
            String providerTicket,
            String providerMessage
    ) {
        return document.status() == classification.finalDocumentStatus()
                && equal(document.providerTicket(), providerTicket)
                && equal(document.providerMessage(), providerMessage);
    }

    private ElectronicDocumentAttempt latestInFlightAttempt(Long documentId) {
        return attemptRepositoryPort
                .findLatestByElectronicDocumentIdAndOperation(documentId, FiscalOperation.SEND)
                .filter(attempt -> attempt.result() == FiscalAttemptResult.STARTED
                        || attempt.result() == FiscalAttemptResult.PENDING)
                .orElse(null);
    }

    private void recordBlocked(ElectronicDocument current, FiscalErrorCategory category, String message) {
        attemptAuditService.recordSendBlocked(
                current,
                category,
                message,
                auditUserProvider.currentUsername(),
                currentTraceId()
        );
    }

    private void recordSignedXmlEvidenceIfMissing(ElectronicDocument document, BillingXmlFile signed) {
        boolean exists = evidenceRepositoryPort.findByElectronicDocumentId(document.id()).stream()
                .anyMatch(evidence -> evidence.evidenceType() == FiscalEvidenceType.SIGNED_XML
                        && evidence.metadataStatus() != FiscalEvidenceMetadataStatus.REVOKED);
        if (exists) {
            return;
        }
        String checksum = attemptAuditService.hashPayload(signed.content());
        if (checksum == null) {
            return;
        }
        evidenceRepositoryPort.save(new ElectronicDocumentEvidence(
                null,
                document.id(),
                null,
                FiscalEvidenceType.SIGNED_XML,
                document.environment(),
                isSimulated(document.environment()),
                FiscalEvidenceStorageProvider.DB_LEGACY,
                evidenceStorageKey(document, FiscalEvidenceType.SIGNED_XML, checksum),
                signed.fileName(),
                signed.mimeType(),
                (long) signed.content().getBytes(StandardCharsets.UTF_8).length,
                checksum,
                checksum,
                null,
                null,
                null,
                FiscalEvidenceMetadataStatus.REGISTERED,
                null,
                auditUserProvider.currentUsername(),
                sanitizer.traceId(currentTraceId()),
                "Signed XML metadata registered from legacy DB storage"
        ));
    }

    private void recordProviderResponseEvidenceIfMissing(
            ElectronicDocument document,
            ElectronicDocumentAttempt attempt,
            ProviderSendResult result,
            FiscalProviderResultClassification classification
    ) {
        String providerStatus = classification.providerStatus() == null
                ? null
                : classification.providerStatus().name();
        String providerTicket = result == null ? null : sanitizer.providerTicket(result.ticket());
        String providerCorrelationId = result == null
                ? null
                : sanitizer.providerCorrelationId(result.providerCorrelationId());
        String providerCode = result == null ? null : sanitizer.providerCode(result.providerCode());
        String providerMessage = result == null ? null : sanitizer.providerMessage(result.message());
        String material = String.join("|",
                providerStatus == null ? "" : providerStatus,
                providerCode == null ? "" : providerCode,
                providerTicket == null ? "" : providerTicket,
                providerCorrelationId == null ? "" : providerCorrelationId,
                providerMessage == null ? "" : providerMessage,
                classification.errorCategory() == null ? "" : classification.errorCategory().name()
        );
        String checksum = attemptAuditService.hashPayload(material);
        if (checksum == null) {
            return;
        }
        boolean duplicate = evidenceRepositoryPort.findByAttemptId(attempt.id()).stream()
                .anyMatch(evidence -> evidence.evidenceType() == FiscalEvidenceType.PROVIDER_RESPONSE_METADATA
                        && checksum.equals(evidence.checksumSha256()));
        if (duplicate) {
            return;
        }
        evidenceRepositoryPort.save(new ElectronicDocumentEvidence(
                null,
                document.id(),
                attempt.id(),
                FiscalEvidenceType.PROVIDER_RESPONSE_METADATA,
                document.environment(),
                isSimulated(document.environment()),
                FiscalEvidenceStorageProvider.NONE,
                null,
                null,
                null,
                null,
                checksum,
                null,
                providerTicket,
                providerCorrelationId,
                providerStatus,
                FiscalEvidenceMetadataStatus.REGISTERED,
                null,
                attempt.actor(),
                attempt.traceId(),
                "Provider response metadata registered without raw payload"
        ));
    }

    private ElectronicDocument copyWithProviderResult(
            ElectronicDocument current,
            ElectronicDocumentStatus status,
            String providerTicket,
            String providerMessage,
            Instant sentAt
    ) {
        return new ElectronicDocument(
                current.id(),
                current.saleId(),
                current.billingSeriesId(),
                current.documentType(),
                status,
                current.environment(),
                current.series(),
                current.number(),
                current.fullNumber(),
                current.customerName(),
                current.customerDocument(),
                current.currencyCode(),
                current.subtotalAmount(),
                current.taxAmount(),
                current.totalAmount(),
                current.xmlGeneratedAt(),
                current.signedAt(),
                sentAt,
                providerTicket,
                providerMessage,
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        );
    }

    private void addHistory(
            Long documentId,
            ElectronicDocumentStatus previous,
            ElectronicDocumentStatus next,
            String message
    ) {
        historyRepositoryPort.save(new ElectronicDocumentStatusHistory(
                null,
                documentId,
                previous,
                next,
                trimToNull(message),
                Instant.now(),
                auditUserProvider.currentUsername()
        ));
    }

    private String evidenceStorageKey(
            ElectronicDocument document,
            FiscalEvidenceType evidenceType,
            String checksum
    ) {
        return "billing/" + document.environment().name() + "/" + document.id()
                + "/" + evidenceType.name() + "/" + checksum;
    }

    private FiscalErrorCategory blockedCategoryForMessage(String message) {
        if (message != null && message.contains(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE)) {
            return FiscalErrorCategory.CONFIGURATION_ERROR;
        }
        return FiscalErrorCategory.VALIDATION_ERROR;
    }

    private FiscalErrorCategory categoryOrValidation(FiscalErrorCategory category) {
        return category == null ? FiscalErrorCategory.VALIDATION_ERROR : category;
    }

    private String sendTrackingMessage(BillingEnvironment environment) {
        if (environment == BillingEnvironment.LOCAL) {
            return "Envio simulado en entorno local.";
        }
        if (environment == BillingEnvironment.BETA) {
            return "Envio simulado en entorno sandbox.";
        }
        return "Comprobante enviado.";
    }

    private boolean isSimulated(BillingEnvironment environment) {
        return environment == BillingEnvironment.LOCAL || environment == BillingEnvironment.BETA;
    }

    private String currentTraceId() {
        return MDC.get(TRACE_ID_MDC_KEY);
    }

    private boolean equal(Object left, Object right) {
        return left == null ? right == null : left.equals(right);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
