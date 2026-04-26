package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
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
@Table(name = "electronic_document_status_history")
public class ElectronicDocumentStatusHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "electronic_document_id", nullable = false)
    private ElectronicDocumentEntity electronicDocument;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private ElectronicDocumentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 20)
    private ElectronicDocumentStatus newStatus;

    @Column(name = "message", length = 400)
    private String message;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @Column(name = "changed_by", nullable = false, length = 120)
    private String changedBy;

    @PrePersist
    void onCreate() {
        if (changedAt == null) {
            changedAt = Instant.now();
        }
    }

    public Long getId() { return id; }
    public ElectronicDocumentEntity getElectronicDocument() { return electronicDocument; }
    public void setElectronicDocument(ElectronicDocumentEntity electronicDocument) { this.electronicDocument = electronicDocument; }
    public ElectronicDocumentStatus getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(ElectronicDocumentStatus previousStatus) { this.previousStatus = previousStatus; }
    public ElectronicDocumentStatus getNewStatus() { return newStatus; }
    public void setNewStatus(ElectronicDocumentStatus newStatus) { this.newStatus = newStatus; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Instant getChangedAt() { return changedAt; }
    public void setChangedAt(Instant changedAt) { this.changedAt = changedAt; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
}

