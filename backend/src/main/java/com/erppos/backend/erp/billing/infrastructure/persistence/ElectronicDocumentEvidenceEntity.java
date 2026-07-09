package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceMetadataStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageProvider;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
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
@Table(name = "electronic_document_evidence")
public class ElectronicDocumentEvidenceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "electronic_document_id", nullable = false)
    private ElectronicDocumentEntity electronicDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id")
    private ElectronicDocumentAttemptEntity attempt;

    @Enumerated(EnumType.STRING)
    @Column(name = "evidence_type", nullable = false, length = 40)
    private FiscalEvidenceType evidenceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "environment", nullable = false, length = 20)
    private BillingEnvironment environment;

    @Column(name = "simulated", nullable = false)
    private boolean simulated;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_provider", nullable = false, length = 30)
    private FiscalEvidenceStorageProvider storageProvider;

    @Column(name = "storage_key", length = 300)
    private String storageKey;

    @Column(name = "file_name", length = 200)
    private String fileName;

    @Column(name = "mime_type", length = 80)
    private String mimeType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "checksum_sha256", length = 64)
    private String checksumSha256;

    @Column(name = "content_hash_sha256", length = 64)
    private String contentHashSha256;

    @Column(name = "provider_ticket", length = 120)
    private String providerTicket;

    @Column(name = "provider_correlation_id", length = 120)
    private String providerCorrelationId;

    @Column(name = "provider_status", length = 40)
    private String providerStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "metadata_status", nullable = false, length = 30)
    private FiscalEvidenceMetadataStatus metadataStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 120)
    private String createdBy;

    @Column(name = "trace_id", length = 80)
    private String traceId;

    @Column(name = "notes", length = 400)
    private String notes;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (storageProvider == null) {
            storageProvider = FiscalEvidenceStorageProvider.NONE;
        }
        if (metadataStatus == null) {
            metadataStatus = FiscalEvidenceMetadataStatus.REGISTERED;
        }
    }

    public Long getId() { return id; }
    public ElectronicDocumentEntity getElectronicDocument() { return electronicDocument; }
    public void setElectronicDocument(ElectronicDocumentEntity electronicDocument) { this.electronicDocument = electronicDocument; }
    public ElectronicDocumentAttemptEntity getAttempt() { return attempt; }
    public void setAttempt(ElectronicDocumentAttemptEntity attempt) { this.attempt = attempt; }
    public FiscalEvidenceType getEvidenceType() { return evidenceType; }
    public void setEvidenceType(FiscalEvidenceType evidenceType) { this.evidenceType = evidenceType; }
    public BillingEnvironment getEnvironment() { return environment; }
    public void setEnvironment(BillingEnvironment environment) { this.environment = environment; }
    public boolean isSimulated() { return simulated; }
    public void setSimulated(boolean simulated) { this.simulated = simulated; }
    public FiscalEvidenceStorageProvider getStorageProvider() { return storageProvider; }
    public void setStorageProvider(FiscalEvidenceStorageProvider storageProvider) { this.storageProvider = storageProvider; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public String getChecksumSha256() { return checksumSha256; }
    public void setChecksumSha256(String checksumSha256) { this.checksumSha256 = checksumSha256; }
    public String getContentHashSha256() { return contentHashSha256; }
    public void setContentHashSha256(String contentHashSha256) { this.contentHashSha256 = contentHashSha256; }
    public String getProviderTicket() { return providerTicket; }
    public void setProviderTicket(String providerTicket) { this.providerTicket = providerTicket; }
    public String getProviderCorrelationId() { return providerCorrelationId; }
    public void setProviderCorrelationId(String providerCorrelationId) { this.providerCorrelationId = providerCorrelationId; }
    public String getProviderStatus() { return providerStatus; }
    public void setProviderStatus(String providerStatus) { this.providerStatus = providerStatus; }
    public FiscalEvidenceMetadataStatus getMetadataStatus() { return metadataStatus; }
    public void setMetadataStatus(FiscalEvidenceMetadataStatus metadataStatus) { this.metadataStatus = metadataStatus; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
