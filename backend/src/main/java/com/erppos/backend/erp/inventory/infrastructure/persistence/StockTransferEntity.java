package com.erppos.backend.erp.inventory.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "stock_transfers")
public class StockTransferEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_warehouse_id", nullable = false)
    private WarehouseEntity sourceWarehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_warehouse_id", nullable = false)
    private WarehouseEntity targetWarehouse;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "reason", nullable = false, length = 300)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by", length = 120)
    private String createdBy;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public WarehouseEntity getSourceWarehouse() {
        return sourceWarehouse;
    }

    public void setSourceWarehouse(WarehouseEntity sourceWarehouse) {
        this.sourceWarehouse = sourceWarehouse;
    }

    public WarehouseEntity getTargetWarehouse() {
        return targetWarehouse;
    }

    public void setTargetWarehouse(WarehouseEntity targetWarehouse) {
        this.targetWarehouse = targetWarehouse;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}

