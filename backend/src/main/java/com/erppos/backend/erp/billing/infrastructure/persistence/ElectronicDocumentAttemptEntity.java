package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.FiscalAttemptResult;
import com.erppos.backend.erp.billing.domain.model.FiscalErrorCategory;
import com.erppos.backend.erp.billing.domain.model.FiscalOperation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "electronic_document_attempts")
public class ElectronicDocumentAttemptEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "electronic_document_id", nullable = false)
    private ElectronicDocumentEntity electronicDocument;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation", nullable = false, length = 30)
    private FiscalOperation operation;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 30)
    private FiscalAttemptResult result;

    @Enumerated(EnumType.STRING)
    @Column(name = "error_category", length = 40)
    private FiscalErrorCategory errorCategory;

    @Column(name = "recoverable", nullable = false)
    private boolean recoverable;

    @Column(name = "provider_status", length = 30)
    private String providerStatus;

    @Column(name = "provider_code", length = 80)
    private String providerCode;

    @Column(name = "provider_message", length = 400)
    private String providerMessage;

    @Column(name = "provider_ticket", length = 120)
    private String providerTicket;

    @Column(name = "provider_correlation_id", length = 120)
    private String providerCorrelationId;

    @Column(name = "request_hash", length = 64)
    private String requestHash;

    @Column(name = "response_hash", length = 64)
    private String responseHash;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "actor", nullable = false, length = 120)
    private String actor;

    @Column(name = "trace_id", length = 80)
    private String traceId;

    @Column(name = "simulated", nullable = false)
    private boolean simulated;

    @PrePersist
    void onCreate() {
        if (startedAt == null) {
            startedAt = Instant.now();
        }
    }

    public Long getId() { return id; }
    public ElectronicDocumentEntity getElectronicDocument() { return electronicDocument; }
    public void setElectronicDocument(ElectronicDocumentEntity electronicDocument) { this.electronicDocument = electronicDocument; }
    public FiscalOperation getOperation() { return operation; }
    public void setOperation(FiscalOperation operation) { this.operation = operation; }
    public int getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(int attemptNumber) { this.attemptNumber = attemptNumber; }
    public FiscalAttemptResult getResult() { return result; }
    public void setResult(FiscalAttemptResult result) { this.result = result; }
    public FiscalErrorCategory getErrorCategory() { return errorCategory; }
    public void setErrorCategory(FiscalErrorCategory errorCategory) { this.errorCategory = errorCategory; }
    public boolean isRecoverable() { return recoverable; }
    public void setRecoverable(boolean recoverable) { this.recoverable = recoverable; }
    public String getProviderStatus() { return providerStatus; }
    public void setProviderStatus(String providerStatus) { this.providerStatus = providerStatus; }
    public String getProviderCode() { return providerCode; }
    public void setProviderCode(String providerCode) { this.providerCode = providerCode; }
    public String getProviderMessage() { return providerMessage; }
    public void setProviderMessage(String providerMessage) { this.providerMessage = providerMessage; }
    public String getProviderTicket() { return providerTicket; }
    public void setProviderTicket(String providerTicket) { this.providerTicket = providerTicket; }
    public String getProviderCorrelationId() { return providerCorrelationId; }
    public void setProviderCorrelationId(String providerCorrelationId) { this.providerCorrelationId = providerCorrelationId; }
    public String getRequestHash() { return requestHash; }
    public void setRequestHash(String requestHash) { this.requestHash = requestHash; }
    public String getResponseHash() { return responseHash; }
    public void setResponseHash(String responseHash) { this.responseHash = responseHash; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Instant finishedAt) { this.finishedAt = finishedAt; }
    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }
    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }
    public boolean isSimulated() { return simulated; }
    public void setSimulated(boolean simulated) { this.simulated = simulated; }
}
