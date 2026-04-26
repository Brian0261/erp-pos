package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "electronic_documents")
public class ElectronicDocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sale_id", nullable = false)
    private Long saleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "billing_series_id", nullable = false)
    private BillingSeriesEntity billingSeries;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 20)
    private ElectronicDocumentType documentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ElectronicDocumentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "environment", nullable = false, length = 20)
    private BillingEnvironment environment;

    @Column(name = "series", nullable = false, length = 10)
    private String series;

    @Column(name = "number", nullable = false)
    private long number;

    @Column(name = "full_number", nullable = false, length = 30)
    private String fullNumber;

    @Column(name = "customer_name", length = 180)
    private String customerName;

    @Column(name = "customer_document", length = 40)
    private String customerDocument;

    @Column(name = "currency_code", nullable = false, length = 10)
    private String currencyCode;

    @Column(name = "subtotal_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotalAmount;

    @Column(name = "tax_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "xml_generated_at")
    private Instant xmlGeneratedAt;

    @Column(name = "signed_at")
    private Instant signedAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "provider_ticket", length = 120)
    private String providerTicket;

    @Column(name = "provider_message", length = 400)
    private String providerMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", nullable = false, length = 120)
    private String createdBy;

    @Column(name = "updated_by", nullable = false, length = 120)
    private String updatedBy;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getSaleId() { return saleId; }
    public void setSaleId(Long saleId) { this.saleId = saleId; }
    public BillingSeriesEntity getBillingSeries() { return billingSeries; }
    public void setBillingSeries(BillingSeriesEntity billingSeries) { this.billingSeries = billingSeries; }
    public ElectronicDocumentType getDocumentType() { return documentType; }
    public void setDocumentType(ElectronicDocumentType documentType) { this.documentType = documentType; }
    public ElectronicDocumentStatus getStatus() { return status; }
    public void setStatus(ElectronicDocumentStatus status) { this.status = status; }
    public BillingEnvironment getEnvironment() { return environment; }
    public void setEnvironment(BillingEnvironment environment) { this.environment = environment; }
    public String getSeries() { return series; }
    public void setSeries(String series) { this.series = series; }
    public long getNumber() { return number; }
    public void setNumber(long number) { this.number = number; }
    public String getFullNumber() { return fullNumber; }
    public void setFullNumber(String fullNumber) { this.fullNumber = fullNumber; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerDocument() { return customerDocument; }
    public void setCustomerDocument(String customerDocument) { this.customerDocument = customerDocument; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public BigDecimal getSubtotalAmount() { return subtotalAmount; }
    public void setSubtotalAmount(BigDecimal subtotalAmount) { this.subtotalAmount = subtotalAmount; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public Instant getXmlGeneratedAt() { return xmlGeneratedAt; }
    public void setXmlGeneratedAt(Instant xmlGeneratedAt) { this.xmlGeneratedAt = xmlGeneratedAt; }
    public Instant getSignedAt() { return signedAt; }
    public void setSignedAt(Instant signedAt) { this.signedAt = signedAt; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
    public String getProviderTicket() { return providerTicket; }
    public void setProviderTicket(String providerTicket) { this.providerTicket = providerTicket; }
    public String getProviderMessage() { return providerMessage; }
    public void setProviderMessage(String providerMessage) { this.providerMessage = providerMessage; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}

