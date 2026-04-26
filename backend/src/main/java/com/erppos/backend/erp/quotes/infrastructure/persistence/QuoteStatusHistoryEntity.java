package com.erppos.backend.erp.quotes.infrastructure.persistence;

import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "quote_status_history")
public class QuoteStatusHistoryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "quote_id", nullable = false)
    private QuoteEntity quote;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private QuoteStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 20)
    private QuoteStatus newStatus;

    @Column(name = "comment", length = 400)
    private String comment;

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
    public QuoteEntity getQuote() { return quote; }
    public void setQuote(QuoteEntity quote) { this.quote = quote; }
    public QuoteStatus getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(QuoteStatus previousStatus) { this.previousStatus = previousStatus; }
    public QuoteStatus getNewStatus() { return newStatus; }
    public void setNewStatus(QuoteStatus newStatus) { this.newStatus = newStatus; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public Instant getChangedAt() { return changedAt; }
    public void setChangedAt(Instant changedAt) { this.changedAt = changedAt; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
}

