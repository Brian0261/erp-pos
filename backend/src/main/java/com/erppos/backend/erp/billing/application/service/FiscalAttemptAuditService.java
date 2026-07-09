package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentAttempt;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalAttemptResult;
import com.erppos.backend.erp.billing.domain.model.FiscalErrorCategory;
import com.erppos.backend.erp.billing.domain.model.FiscalOperation;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentAttemptRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class FiscalAttemptAuditService {

    private final ElectronicDocumentAttemptRepositoryPort attemptRepositoryPort;
    private final FiscalAuditSanitizer sanitizer;

    public FiscalAttemptAuditService(
            ElectronicDocumentAttemptRepositoryPort attemptRepositoryPort,
            FiscalAuditSanitizer sanitizer
    ) {
        this.attemptRepositoryPort = attemptRepositoryPort;
        this.sanitizer = sanitizer;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ElectronicDocumentAttempt startSendAttempt(ElectronicDocument document, String requestHash, String actor, String traceId) {
        int attemptNumber = attemptRepositoryPort.nextAttemptNumber(document.id(), FiscalOperation.SEND);
        return attemptRepositoryPort.save(new ElectronicDocumentAttempt(
                null,
                document.id(),
                FiscalOperation.SEND,
                attemptNumber,
                FiscalAttemptResult.STARTED,
                null,
                false,
                null,
                null,
                null,
                null,
                null,
                requestHash,
                null,
                Instant.now(),
                null,
                actor,
                sanitizer.traceId(traceId),
                isSimulated(document.environment())
        ));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ElectronicDocumentAttempt recordSendBlocked(
            ElectronicDocument document,
            FiscalErrorCategory errorCategory,
            String message,
            String actor,
            String traceId
    ) {
        int attemptNumber = attemptRepositoryPort.nextAttemptNumber(document.id(), FiscalOperation.SEND);
        Instant now = Instant.now();
        String providerStatus = document.status() == null ? null : document.status().name();
        String providerMessage = sanitizer.providerMessage(message);
        String providerTicket = sanitizer.providerTicket(document.providerTicket());
        return attemptRepositoryPort.save(new ElectronicDocumentAttempt(
                null,
                document.id(),
                FiscalOperation.SEND,
                attemptNumber,
                FiscalAttemptResult.BLOCKED,
                errorCategory,
                false,
                providerStatus,
                null,
                providerMessage,
                providerTicket,
                null,
                null,
                responseHash(providerStatus, null, providerMessage, providerTicket),
                now,
                now,
                actor,
                sanitizer.traceId(traceId),
                isSimulated(document.environment())
        ));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ElectronicDocumentAttempt finishSendAttempt(
            ElectronicDocumentAttempt attempt,
            ProviderSendResult result,
            FiscalProviderResultClassification classification
    ) {
        String providerStatus = classification.providerStatus() == null ? null : classification.providerStatus().name();
        String providerTicket = result == null ? null : result.ticket();
        String providerMessage = result == null ? null : result.message();
        String providerCode = result == null ? null : result.providerCode();
        String providerCorrelationId = result == null ? null : result.providerCorrelationId();
        return attemptRepositoryPort.save(copy(
                attempt,
                classification.attemptResult(),
                classification.errorCategory(),
                classification.recoverable(),
                providerStatus,
                providerCode,
                providerMessage,
                providerTicket,
                providerCorrelationId
        ));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ElectronicDocumentAttempt failSendAttempt(
            ElectronicDocumentAttempt attempt,
            FiscalProviderResultClassification classification,
            String message
    ) {
        return attemptRepositoryPort.save(copy(
                attempt,
                classification.attemptResult(),
                classification.errorCategory(),
                classification.recoverable(),
                classification.providerStatus() == null ? null : classification.providerStatus().name(),
                null,
                message,
                null,
                null
        ));
    }

    public String hashPayload(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    private ElectronicDocumentAttempt copy(
            ElectronicDocumentAttempt attempt,
            FiscalAttemptResult result,
            FiscalErrorCategory errorCategory,
            boolean recoverable,
            String providerStatus,
            String providerCode,
            String providerMessage,
            String providerTicket,
            String providerCorrelationId
    ) {
        String sanitizedStatus = sanitizer.providerCode(providerStatus);
        String sanitizedCode = sanitizer.providerCode(providerCode);
        String sanitizedMessage = sanitizer.providerMessage(providerMessage);
        String sanitizedTicket = sanitizer.providerTicket(providerTicket);
        String sanitizedCorrelationId = sanitizer.providerCorrelationId(providerCorrelationId);
        return new ElectronicDocumentAttempt(
                attempt.id(),
                attempt.electronicDocumentId(),
                attempt.operation(),
                attempt.attemptNumber(),
                result,
                errorCategory,
                recoverable,
                sanitizedStatus,
                sanitizedCode,
                sanitizedMessage,
                sanitizedTicket,
                sanitizedCorrelationId,
                attempt.requestHash(),
                responseHash(sanitizedStatus, sanitizedCode, sanitizedMessage, sanitizedTicket),
                attempt.startedAt(),
                Instant.now(),
                attempt.actor(),
                attempt.traceId(),
                attempt.simulated()
        );
    }

    private boolean isSimulated(BillingEnvironment environment) {
        return environment == BillingEnvironment.LOCAL || environment == BillingEnvironment.BETA;
    }

    private String responseHash(String providerStatus, String providerCode, String providerMessage, String providerTicket) {
        String material = String.join("|",
                providerStatus == null ? "" : providerStatus,
                providerCode == null ? "" : providerCode,
                providerMessage == null ? "" : providerMessage,
                providerTicket == null ? "" : providerTicket
        );
        return material.isBlank() ? null : hashPayload(material);
    }
}
