package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.AssetSource;
import com.erppos.backend.erp.ecommerce.domain.model.AssetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "ecommerce_product_assets")
public class ProductAssetEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_online_profile_id", nullable = false)
    private Long productOnlineProfileId;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false, length = 30)
    private AssetType assetType;

    @Column(name = "asset_url", nullable = false, length = 1000)
    private String assetUrl;

    @Column(name = "alt_text", length = 180)
    private String altText;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private AssetSource source;

    @Column(name = "rights_confirmed", nullable = false)
    private boolean rightsConfirmed;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 120)
    private String createdBy;

    @Column(name = "updated_by", length = 120)
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
    public Long getProductOnlineProfileId() { return productOnlineProfileId; }
    public void setProductOnlineProfileId(Long productOnlineProfileId) { this.productOnlineProfileId = productOnlineProfileId; }
    public AssetType getAssetType() { return assetType; }
    public void setAssetType(AssetType assetType) { this.assetType = assetType; }
    public String getAssetUrl() { return assetUrl; }
    public void setAssetUrl(String assetUrl) { this.assetUrl = assetUrl; }
    public String getAltText() { return altText; }
    public void setAltText(String altText) { this.altText = altText; }
    public AssetSource getSource() { return source; }
    public void setSource(AssetSource source) { this.source = source; }
    public boolean isRightsConfirmed() { return rightsConfirmed; }
    public void setRightsConfirmed(boolean rightsConfirmed) { this.rightsConfirmed = rightsConfirmed; }
    public boolean isPrimary() { return primary; }
    public void setPrimary(boolean primary) { this.primary = primary; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
