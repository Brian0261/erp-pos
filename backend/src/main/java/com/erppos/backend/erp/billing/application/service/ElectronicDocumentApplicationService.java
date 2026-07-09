package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.application.usecase.CreateElectronicDocumentFromSaleCommand;
import com.erppos.backend.erp.billing.application.usecase.ElectronicDocumentUseCase;
import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFileType;
import com.erppos.backend.erp.billing.domain.model.BillingSaleItemSnapshot;
import com.erppos.backend.erp.billing.domain.model.BillingSaleSnapshot;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentEvidence;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentAttempt;
import com.erppos.backend.erp.billing.domain.model.FiscalAttemptResult;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceMetadataStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageProvider;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
import com.erppos.backend.erp.billing.domain.model.FiscalErrorCategory;
import com.erppos.backend.erp.billing.domain.model.FiscalOperation;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.port.BillingSaleReadPort;
import com.erppos.backend.erp.billing.domain.port.BillingSeriesRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.BillingXmlFileRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.CompanyBillingProfileRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentAttemptRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentEvidenceRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentItemRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentStatusHistoryRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.UblXmlGeneratorPort;
import com.erppos.backend.erp.billing.domain.port.XmlSignerPort;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class ElectronicDocumentApplicationService implements ElectronicDocumentUseCase {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final String TRACE_ID_MDC_KEY = "traceId";

    private final ElectronicDocumentRepositoryPort documentRepositoryPort;
    private final ElectronicDocumentItemRepositoryPort itemRepositoryPort;
    private final ElectronicDocumentStatusHistoryRepositoryPort historyRepositoryPort;
    private final ElectronicDocumentAttemptRepositoryPort attemptRepositoryPort;
    private final ElectronicDocumentEvidenceRepositoryPort evidenceRepositoryPort;
    private final BillingSeriesRepositoryPort seriesRepositoryPort;
    private final CompanyBillingProfileRepositoryPort profileRepositoryPort;
    private final BillingSaleReadPort saleReadPort;
    private final BillingXmlFileRepositoryPort xmlFileRepositoryPort;
    private final UblXmlGeneratorPort ublXmlGeneratorPort;
    private final XmlSignerPort xmlSignerPort;
    private final ElectronicBillingProviderPort billingProviderPort;
    private final BillingRuntimeSafetyPolicy runtimeSafetyPolicy;
    private final ElectronicDocumentLifecyclePolicy lifecyclePolicy;
    private final FiscalAttemptAuditService attemptAuditService;
    private final FiscalAuditSanitizer fiscalAuditSanitizer;
    private final FiscalProviderResultClassifier providerResultClassifier;
    private final AuditUserProvider auditUserProvider;

    public ElectronicDocumentApplicationService(
            ElectronicDocumentRepositoryPort documentRepositoryPort,
            ElectronicDocumentItemRepositoryPort itemRepositoryPort,
            ElectronicDocumentStatusHistoryRepositoryPort historyRepositoryPort,
            ElectronicDocumentAttemptRepositoryPort attemptRepositoryPort,
            ElectronicDocumentEvidenceRepositoryPort evidenceRepositoryPort,
            BillingSeriesRepositoryPort seriesRepositoryPort,
            CompanyBillingProfileRepositoryPort profileRepositoryPort,
            BillingSaleReadPort saleReadPort,
            BillingXmlFileRepositoryPort xmlFileRepositoryPort,
            UblXmlGeneratorPort ublXmlGeneratorPort,
            XmlSignerPort xmlSignerPort,
            ElectronicBillingProviderPort billingProviderPort,
            BillingRuntimeSafetyPolicy runtimeSafetyPolicy,
            ElectronicDocumentLifecyclePolicy lifecyclePolicy,
            FiscalAttemptAuditService attemptAuditService,
            FiscalAuditSanitizer fiscalAuditSanitizer,
            FiscalProviderResultClassifier providerResultClassifier,
            AuditUserProvider auditUserProvider
    ) {
        this.documentRepositoryPort = documentRepositoryPort;
        this.itemRepositoryPort = itemRepositoryPort;
        this.historyRepositoryPort = historyRepositoryPort;
        this.attemptRepositoryPort = attemptRepositoryPort;
        this.evidenceRepositoryPort = evidenceRepositoryPort;
        this.seriesRepositoryPort = seriesRepositoryPort;
        this.profileRepositoryPort = profileRepositoryPort;
        this.saleReadPort = saleReadPort;
        this.xmlFileRepositoryPort = xmlFileRepositoryPort;
        this.ublXmlGeneratorPort = ublXmlGeneratorPort;
        this.xmlSignerPort = xmlSignerPort;
        this.billingProviderPort = billingProviderPort;
        this.runtimeSafetyPolicy = runtimeSafetyPolicy;
        this.lifecyclePolicy = lifecyclePolicy;
        this.attemptAuditService = attemptAuditService;
        this.fiscalAuditSanitizer = fiscalAuditSanitizer;
        this.providerResultClassifier = providerResultClassifier;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    @Transactional
    public ElectronicDocument createFromSale(Long saleId, CreateElectronicDocumentFromSaleCommand command) {
        if (saleId == null) {
            throw new BillingBusinessRuleException("saleId is required");
        }
        if (command.documentType() == null) {
            throw new BillingBusinessRuleException("documentType is required");
        }
        if (command.billingSeriesId() == null) {
            throw new BillingBusinessRuleException("billingSeriesId is required");
        }

        BillingSaleSnapshot sale = saleReadPort.findById(saleId)
                .orElseThrow(() -> new BillingNotFoundException("Sale not found"));

        if (!"COMPLETED".equalsIgnoreCase(sale.status())) {
            throw new BillingBusinessRuleException("Only COMPLETED sales can be billed");
        }
        if (documentRepositoryPort.existsBySaleId(saleId)) {
            throw new BillingConflictException("La venta ya tiene un comprobante asociado.");
        }
        if (sale.totalAmount() == null || sale.totalAmount().compareTo(ZERO) <= 0) {
            throw new BillingBusinessRuleException("Sale total must be > 0");
        }

        BillingSeries series = seriesRepositoryPort.findByIdForUpdate(command.billingSeriesId())
                .orElseThrow(() -> new BillingNotFoundException("Billing series not found"));
        if (!series.active()) {
            throw new BillingBusinessRuleException("Billing series is inactive");
        }
        if (series.documentType() != command.documentType()) {
            throw new BillingBusinessRuleException("Billing series is incompatible with document type");
        }
        documentRepositoryPort.findMaxIssuedNumberByBillingSeriesId(series.id())
                .ifPresent(lastIssuedNumber -> {
                    if (series.currentNumber() <= lastIssuedNumber) {
                        throw new BillingConflictException("El correlativo de la serie no es valido. Debe ser mayor al ultimo comprobante emitido.");
                    }
                });

        CompanyBillingProfile profile = profileRepositoryPort.findActiveByEnvironment(series.environment())
                .orElseThrow(() -> new BillingNotFoundException("Billing profile not found for series environment"));
        runtimeSafetyPolicy.assertCanCreateFromSale(profile.environment());

        String customerName = trimToNull(command.customerName());
        String customerDocument = trimToNull(command.customerDocument());
        if (command.documentType() == ElectronicDocumentType.INVOICE) {
            if (customerName == null || customerDocument == null) {
                throw new BillingBusinessRuleException("INVOICE requires customerName and customerDocument");
            }
        } else if (customerName == null) {
            customerName = "CONSUMIDOR FINAL";
        }

        long issuedNumber = series.currentNumber();
        BillingSeries nextSeries = new BillingSeries(
                series.id(),
                series.documentType(),
                series.series(),
                issuedNumber + 1,
                series.environment(),
                series.active(),
                series.createdAt(),
                series.updatedAt(),
                series.createdBy(),
                auditUserProvider.currentUsername()
        );
        seriesRepositoryPort.save(nextSeries);

        String fullNumber = series.series() + "-" + String.format("%08d", issuedNumber);
        ElectronicDocument draft = documentRepositoryPort.save(new ElectronicDocument(
                null,
                sale.id(),
                series.id(),
                command.documentType(),
                ElectronicDocumentStatus.DRAFT,
                profile.environment(),
                series.series(),
                issuedNumber,
                fullNumber,
                customerName,
                customerDocument,
                "PEN",
                normalize(sale.subtotalAmount()),
                ZERO,
                normalize(sale.totalAmount()),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                auditUserProvider.currentUsername(),
                auditUserProvider.currentUsername()
        ));

        List<ElectronicDocumentItem> items = sale.items().stream()
                .map(this::toDocumentItem)
                .toList();
        itemRepositoryPort.saveAll(draft.id(), items);

        addHistory(draft.id(), null, ElectronicDocumentStatus.DRAFT, "Document created from sale");
        return draft;
    }

    @Override
    public List<ElectronicDocument> list(ElectronicDocumentStatus status, ElectronicDocumentType type, Long saleId, LocalDate from, LocalDate to) {
        return documentRepositoryPort.findByFilters(status, type, saleId, from, to);
    }

    @Override
    public ElectronicDocument getById(Long id) {
        return documentRepositoryPort.findById(id)
                .orElseThrow(() -> new BillingNotFoundException("Electronic document not found"));
    }

    @Override
    @Transactional
    public ElectronicDocument generateXml(Long id) {
        ElectronicDocument current = getByIdForUpdate(id);
        if (current.status() == ElectronicDocumentStatus.GENERATED) {
            return current;
        }
        lifecyclePolicy.assertCanGenerateXml(current.status());

        CompanyBillingProfile profile = profileRepositoryPort.findActiveByEnvironment(current.environment())
                .orElseThrow(() -> new BillingNotFoundException("Billing profile not found for document environment"));
        List<ElectronicDocumentItem> items = itemRepositoryPort.findByElectronicDocumentId(id);
        String xml = ublXmlGeneratorPort.generate(current, profile, items);

        xmlFileRepositoryPort.save(new BillingXmlFile(
                null,
                id,
                BillingXmlFileType.GENERATED,
                current.fullNumber() + ".xml",
                xml,
                "application/xml",
                null,
                auditUserProvider.currentUsername()
        ));

        ElectronicDocument updated = updateStatus(current, ElectronicDocumentStatus.GENERATED, "XML generated");
        return documentRepositoryPort.save(updated);
    }

    @Override
    @Transactional
    public ElectronicDocument sign(Long id) {
        ElectronicDocument current = getByIdForUpdate(id);
        if (current.status() == ElectronicDocumentStatus.SIGNED) {
            runtimeSafetyPolicy.assertCanSign(current.environment());
            xmlFileRepositoryPort.findByElectronicDocumentIdAndFileType(id, BillingXmlFileType.SIGNED)
                    .ifPresent(signed -> recordSignedXmlEvidenceIfMissing(current, signed));
            return current;
        }
        lifecyclePolicy.assertCanSign(current.status());
        runtimeSafetyPolicy.assertCanSign(current.environment());

        BillingXmlFile generated = xmlFileRepositoryPort.findByElectronicDocumentIdAndFileType(id, BillingXmlFileType.GENERATED)
                .orElseThrow(() -> new BillingNotFoundException("XML generado no disponible. Genera el XML antes de firmar."));
        CompanyBillingProfile profile = profileRepositoryPort.findActiveByEnvironment(current.environment())
                .orElseThrow(() -> new BillingNotFoundException("Billing profile not found for document environment"));

        String signedXml = xmlSignerPort.signXml(generated.content(), profile);
        BillingXmlFile signedFile = xmlFileRepositoryPort.save(new BillingXmlFile(
                null,
                id,
                BillingXmlFileType.SIGNED,
                current.fullNumber() + "-signed.xml",
                signedXml,
                "application/xml",
                null,
                auditUserProvider.currentUsername()
        ));

        ElectronicDocument updated = updateStatus(current, ElectronicDocumentStatus.SIGNED, "XML signed");
        ElectronicDocument saved = documentRepositoryPort.save(updated);
        recordSignedXmlEvidenceIfMissing(saved, signedFile);
        return saved;
    }

    @Override
    @Transactional
    public ElectronicDocument send(Long id) {
        ElectronicDocument current = getByIdForUpdate(id);
        assertCanSendOrRecordBlocked(current);

        BillingXmlFile signed = getSignedXmlOrRecordBlocked(current);
        recordSignedXmlEvidenceIfMissing(current, signed);
        ElectronicDocumentAttempt attempt = attemptAuditService.startSendAttempt(
                current,
                attemptAuditService.hashPayload(signed.content()),
                auditUserProvider.currentUsername(),
                currentTraceId()
        );

        ElectronicDocument sent = updateStatus(current, ElectronicDocumentStatus.SENT, sendTrackingMessage(current.environment()));
        sent = documentRepositoryPort.save(sent);

        ProviderSendResult result;
        try {
            result = billingProviderPort.send(sent, signed.content());
        } catch (RuntimeException ex) {
            attemptAuditService.failSendAttempt(attempt, providerResultClassifier.classifyException(ex), ex.getMessage());
            throw ex;
        }

        FiscalProviderResultClassification classification = providerResultClassifier.classify(result);
        ElectronicDocumentStatus finalStatus = classification.finalDocumentStatus();
        try {
            if (finalStatus != ElectronicDocumentStatus.SENT) {
                lifecyclePolicy.assertTransitionAllowed(sent.status(), finalStatus);
            }
            runtimeSafetyPolicy.assertCanAcceptProviderResult(sent.environment(), finalStatus);
        } catch (RuntimeException ex) {
            attemptAuditService.failSendAttempt(attempt, providerResultClassifier.failure(classifyPostProviderFailure(ex)), ex.getMessage());
            throw ex;
        }

        String providerTicket = result == null ? null : fiscalAuditSanitizer.providerTicket(result.ticket());
        String providerMessage = result == null ? null : fiscalAuditSanitizer.providerMessage(result.message());

        ElectronicDocument finalized = new ElectronicDocument(
                sent.id(),
                sent.saleId(),
                sent.billingSeriesId(),
                sent.documentType(),
                finalStatus,
                sent.environment(),
                sent.series(),
                sent.number(),
                sent.fullNumber(),
                sent.customerName(),
                sent.customerDocument(),
                sent.currencyCode(),
                sent.subtotalAmount(),
                sent.taxAmount(),
                sent.totalAmount(),
                sent.xmlGeneratedAt(),
                sent.signedAt(),
                Instant.now(),
                providerTicket,
                providerMessage,
                sent.createdAt(),
                sent.updatedAt(),
                sent.createdBy(),
                auditUserProvider.currentUsername()
        );
        ElectronicDocument saved = documentRepositoryPort.save(finalized);
        if (finalStatus != ElectronicDocumentStatus.SENT) {
            addHistory(saved.id(), ElectronicDocumentStatus.SENT, finalStatus, providerMessage);
        }
        ElectronicDocumentAttempt finishedAttempt = attemptAuditService.finishSendAttempt(attempt, result, classification);
        recordProviderResponseEvidenceIfMissing(saved, finishedAttempt, result, classification);
        return saved;
    }

    @Override
    @Transactional
    public ElectronicDocument retrySend(Long id) {
        ElectronicDocument current = getByIdForUpdate(id);
        assertCanRetrySendOrRecordBlocked(current);

        BillingXmlFile signed = getSignedXmlOrRecordBlocked(current);
        recordSignedXmlEvidenceIfMissing(current, signed);
        ElectronicDocumentAttempt attempt = attemptAuditService.startSendAttempt(
                current,
                attemptAuditService.hashPayload(signed.content()),
                auditUserProvider.currentUsername(),
                currentTraceId()
        );

        ElectronicDocument sent = markManualRetryAsSent(current);
        sent = documentRepositoryPort.save(sent);

        ProviderSendResult result;
        try {
            result = billingProviderPort.send(sent, signed.content());
        } catch (RuntimeException ex) {
            attemptAuditService.failSendAttempt(attempt, providerResultClassifier.classifyException(ex), ex.getMessage());
            throw ex;
        }

        FiscalProviderResultClassification classification = providerResultClassifier.classify(result);
        ElectronicDocumentStatus finalStatus = classification.finalDocumentStatus();
        try {
            if (finalStatus != ElectronicDocumentStatus.SENT) {
                lifecyclePolicy.assertTransitionAllowed(sent.status(), finalStatus);
            }
            runtimeSafetyPolicy.assertCanAcceptProviderResult(sent.environment(), finalStatus);
        } catch (RuntimeException ex) {
            attemptAuditService.failSendAttempt(attempt, providerResultClassifier.failure(classifyPostProviderFailure(ex)), ex.getMessage());
            throw ex;
        }

        String providerTicket = result == null ? null : fiscalAuditSanitizer.providerTicket(result.ticket());
        String providerMessage = result == null ? null : fiscalAuditSanitizer.providerMessage(result.message());

        ElectronicDocument finalized = new ElectronicDocument(
                sent.id(),
                sent.saleId(),
                sent.billingSeriesId(),
                sent.documentType(),
                finalStatus,
                sent.environment(),
                sent.series(),
                sent.number(),
                sent.fullNumber(),
                sent.customerName(),
                sent.customerDocument(),
                sent.currencyCode(),
                sent.subtotalAmount(),
                sent.taxAmount(),
                sent.totalAmount(),
                sent.xmlGeneratedAt(),
                sent.signedAt(),
                Instant.now(),
                providerTicket,
                providerMessage,
                sent.createdAt(),
                sent.updatedAt(),
                sent.createdBy(),
                auditUserProvider.currentUsername()
        );
        ElectronicDocument saved = documentRepositoryPort.save(finalized);
        if (finalStatus != ElectronicDocumentStatus.SENT) {
            addHistory(saved.id(), ElectronicDocumentStatus.SENT, finalStatus, providerMessage);
        }
        ElectronicDocumentAttempt finishedAttempt = attemptAuditService.finishSendAttempt(attempt, result, classification);
        recordProviderResponseEvidenceIfMissing(saved, finishedAttempt, result, classification);
        return saved;
    }

    @Override
    public List<ElectronicDocumentItem> items(Long id) {
        getById(id);
        return itemRepositoryPort.findByElectronicDocumentId(id);
    }

    @Override
    public BillingXmlFile getXml(Long id) {
        getById(id);
        return xmlFileRepositoryPort.findByElectronicDocumentIdAndFileType(id, BillingXmlFileType.SIGNED)
                .or(() -> xmlFileRepositoryPort.findByElectronicDocumentIdAndFileType(id, BillingXmlFileType.GENERATED))
                .orElseThrow(() -> new BillingNotFoundException("XML file not found"));
    }

    @Override
    public List<ElectronicDocumentEvidence> evidence(Long id) {
        getById(id);
        return evidenceRepositoryPort.findByElectronicDocumentId(id);
    }

    @Override
    public List<ElectronicDocumentStatusHistory> history(Long id) {
        getById(id);
        return historyRepositoryPort.findByElectronicDocumentId(id);
    }

    private ElectronicDocument updateStatus(ElectronicDocument current, ElectronicDocumentStatus next, String message) {
        if (current.status() == next) {
            return current;
        }
        lifecyclePolicy.assertTransitionAllowed(current.status(), next);
        ElectronicDocument updated = new ElectronicDocument(
                current.id(),
                current.saleId(),
                current.billingSeriesId(),
                current.documentType(),
                next,
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
                next == ElectronicDocumentStatus.GENERATED ? Instant.now() : current.xmlGeneratedAt(),
                next == ElectronicDocumentStatus.SIGNED ? Instant.now() : current.signedAt(),
                current.sentAt(),
                current.providerTicket(),
                current.providerMessage(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        );
        addHistory(current.id(), current.status(), next, message);
        return updated;
    }

    private ElectronicDocument getByIdForUpdate(Long id) {
        return documentRepositoryPort.findByIdForUpdate(id)
                .orElseThrow(() -> new BillingNotFoundException("Electronic document not found"));
    }

    private void assertCanRetrySendOrRecordBlocked(ElectronicDocument current) {
        try {
            lifecyclePolicy.assertCanRetrySend(current.status());
        } catch (BillingConflictException ex) {
            throw recordManualRetryBlocked(current, FiscalErrorCategory.VALIDATION_ERROR, ex.getMessage());
        }

        ElectronicDocumentAttempt lastAttempt = attemptRepositoryPort.findLatestByElectronicDocumentIdAndOperation(current.id(), FiscalOperation.SEND)
                .orElseThrow(() -> recordManualRetryBlocked(
                        current,
                        FiscalErrorCategory.VALIDATION_ERROR,
                        "No existe un attempt SEND fallido recuperable para reintentar."
                ));

        if (lastAttempt.result() != FiscalAttemptResult.FAILED) {
            throw recordManualRetryBlocked(
                    current,
                    categoryOrValidation(lastAttempt.errorCategory()),
                    "El ultimo attempt SEND no esta fallido; no permite retry manual."
            );
        }
        if (!lastAttempt.recoverable()) {
            throw recordManualRetryBlocked(
                    current,
                    categoryOrValidation(lastAttempt.errorCategory()),
                    "El ultimo attempt SEND no es recuperable para retry manual."
            );
        }
        if (lastAttempt.errorCategory() == null) {
            throw recordManualRetryBlocked(
                    current,
                    FiscalErrorCategory.VALIDATION_ERROR,
                    "El ultimo attempt SEND no tiene categoria fiscal clara para retry manual."
            );
        }
        if (!isManualRetryAllowedCategory(lastAttempt.errorCategory())) {
            throw recordManualRetryBlocked(
                    current,
                    lastAttempt.errorCategory(),
                    "La categoria fiscal del ultimo attempt SEND no permite retry manual."
            );
        }
        if (attemptRepositoryPort.nextAttemptNumber(current.id(), FiscalOperation.SEND) != lastAttempt.attemptNumber() + 1) {
            throw recordManualRetryBlocked(
                    current,
                    FiscalErrorCategory.VALIDATION_ERROR,
                    "El ultimo attempt SEND cambio antes de iniciar el retry manual."
            );
        }

        try {
            runtimeSafetyPolicy.assertCanSend(current.environment());
        } catch (BillingConflictException ex) {
            throw recordManualRetryBlocked(current, blockedCategoryForMessage(ex.getMessage()), ex.getMessage());
        }
    }

    private void assertCanSendOrRecordBlocked(ElectronicDocument current) {
        try {
            lifecyclePolicy.assertCanSend(current.status());
            runtimeSafetyPolicy.assertCanSend(current.environment());
        } catch (BillingConflictException ex) {
            FiscalErrorCategory errorCategory = ex.getMessage() != null
                    && ex.getMessage().contains(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE)
                    ? FiscalErrorCategory.CONFIGURATION_ERROR
                    : FiscalErrorCategory.VALIDATION_ERROR;
            attemptAuditService.recordSendBlocked(
                    current,
                    errorCategory,
                    ex.getMessage(),
                    auditUserProvider.currentUsername(),
                    currentTraceId()
            );
            throw ex;
        }
    }

    private BillingXmlFile getSignedXmlOrRecordBlocked(ElectronicDocument current) {
        return xmlFileRepositoryPort.findByElectronicDocumentIdAndFileType(current.id(), BillingXmlFileType.SIGNED)
                .orElseThrow(() -> {
                    String message = "XML firmado no disponible. Firma el XML antes de enviar.";
                    attemptAuditService.recordSendBlocked(
                            current,
                            FiscalErrorCategory.VALIDATION_ERROR,
                            message,
                            auditUserProvider.currentUsername(),
                            currentTraceId()
                    );
                    return new BillingNotFoundException(message);
                });
    }

    private void recordSignedXmlEvidenceIfMissing(ElectronicDocument document, BillingXmlFile signed) {
        boolean activeSignedXmlExists = evidenceRepositoryPort.findByElectronicDocumentId(document.id()).stream()
                .anyMatch(evidence -> evidence.evidenceType() == FiscalEvidenceType.SIGNED_XML
                        && evidence.metadataStatus() != FiscalEvidenceMetadataStatus.REVOKED);
        if (activeSignedXmlExists) {
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
                fiscalAuditSanitizer.traceId(currentTraceId()),
                "Signed XML metadata registered from legacy DB storage"
        ));
    }

    private void recordProviderResponseEvidenceIfMissing(
            ElectronicDocument document,
            ElectronicDocumentAttempt attempt,
            ProviderSendResult result,
            FiscalProviderResultClassification classification
    ) {
        String providerStatus = classification.providerStatus() == null ? null : classification.providerStatus().name();
        String providerTicket = result == null ? null : fiscalAuditSanitizer.providerTicket(result.ticket());
        String providerCorrelationId = result == null ? null : fiscalAuditSanitizer.providerCorrelationId(result.providerCorrelationId());
        String providerCode = result == null ? null : fiscalAuditSanitizer.providerCode(result.providerCode());
        String providerMessage = result == null ? null : fiscalAuditSanitizer.providerMessage(result.message());
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
        boolean duplicateExists = evidenceRepositoryPort.findByAttemptId(attempt.id()).stream()
                .anyMatch(evidence -> evidence.evidenceType() == FiscalEvidenceType.PROVIDER_RESPONSE_METADATA
                        && checksum.equals(evidence.checksumSha256()));
        if (duplicateExists) {
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

    private String evidenceStorageKey(ElectronicDocument document, FiscalEvidenceType evidenceType, String checksum) {
        return "billing/" + document.environment().name() + "/" + document.id() + "/" + evidenceType.name() + "/" + checksum;
    }

    private ElectronicDocument markManualRetryAsSent(ElectronicDocument current) {
        addHistory(current.id(), current.status(), ElectronicDocumentStatus.SENT, "Retry fiscal manual iniciado.");
        return new ElectronicDocument(
                current.id(),
                current.saleId(),
                current.billingSeriesId(),
                current.documentType(),
                ElectronicDocumentStatus.SENT,
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
                current.sentAt(),
                current.providerTicket(),
                current.providerMessage(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                auditUserProvider.currentUsername()
        );
    }

    private BillingConflictException recordManualRetryBlocked(ElectronicDocument current, FiscalErrorCategory category, String message) {
        attemptAuditService.recordSendBlocked(
                current,
                category,
                message,
                auditUserProvider.currentUsername(),
                currentTraceId()
        );
        return new BillingConflictException(message);
    }

    private FiscalErrorCategory categoryOrValidation(FiscalErrorCategory category) {
        return category == null ? FiscalErrorCategory.VALIDATION_ERROR : category;
    }

    private FiscalErrorCategory blockedCategoryForMessage(String message) {
        if (message != null && message.contains(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE)) {
            return FiscalErrorCategory.CONFIGURATION_ERROR;
        }
        return FiscalErrorCategory.VALIDATION_ERROR;
    }

    private boolean isManualRetryAllowedCategory(FiscalErrorCategory category) {
        return category == FiscalErrorCategory.PROVIDER_TIMEOUT
                || category == FiscalErrorCategory.PROVIDER_UNAVAILABLE
                || category == FiscalErrorCategory.COMMUNICATION_ERROR;
    }

    private FiscalErrorCategory classifyPostProviderFailure(RuntimeException ex) {
        if (ex.getMessage() != null && ex.getMessage().contains(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE)) {
            return FiscalErrorCategory.CONFIGURATION_ERROR;
        }
        return FiscalErrorCategory.INTERNAL_ERROR;
    }

    private String currentTraceId() {
        return MDC.get(TRACE_ID_MDC_KEY);
    }

    private void addHistory(Long documentId, ElectronicDocumentStatus previous, ElectronicDocumentStatus next, String message) {
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

    private ElectronicDocumentItem toDocumentItem(BillingSaleItemSnapshot saleItem) {
        String description = trimToNull(saleItem.productName());
        if (description == null) {
            description = "Product " + saleItem.productId();
        }
        return new ElectronicDocumentItem(
                null,
                null,
                saleItem.productId(),
                description,
                normalize(saleItem.quantity()),
                normalize(saleItem.unitPrice()),
                normalize(saleItem.discountAmount()),
                normalize(saleItem.lineTotal())
        );
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

    private BigDecimal normalize(BigDecimal value) {
        if (value == null) {
            return ZERO;
        }
        return value.stripTrailingZeros();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}


