package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariantKind;
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
@Table(name = "ecommerce_product_asset_variants")
public class ProductAssetVariantEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_asset_id", nullable = false)
    private Long productAssetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "variant_kind", nullable = false, length = 40)
    private ProductAssetVariantKind variantKind;

    @Column(name = "asset_url", nullable = false, length = 1000)
    private String assetUrl;

    @Column(name = "storage_provider", length = 30)
    private String storageProvider;

    @Column(name = "storage_bucket", length = 255)
    private String storageBucket;

    @Column(name = "storage_key", nullable = false, length = 1000)
    private String storageKey;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "width", nullable = false)
    private Integer width;

    @Column(name = "height", nullable = false)
    private Integer height;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "checksum_sha256", nullable = false, length = 64)
    private String checksumSha256;

    @Column(name = "source_checksum_sha256", length = 64)
    private String sourceChecksumSha256;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "preferred", nullable = false)
    private boolean preferred;

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
    public Long getProductAssetId() { return productAssetId; }
    public void setProductAssetId(Long productAssetId) { this.productAssetId = productAssetId; }
    public ProductAssetVariantKind getVariantKind() { return variantKind; }
    public void setVariantKind(ProductAssetVariantKind variantKind) { this.variantKind = variantKind; }
    public String getAssetUrl() { return assetUrl; }
    public void setAssetUrl(String assetUrl) { this.assetUrl = assetUrl; }
    public String getStorageProvider() { return storageProvider; }
    public void setStorageProvider(String storageProvider) { this.storageProvider = storageProvider; }
    public String getStorageBucket() { return storageBucket; }
    public void setStorageBucket(String storageBucket) { this.storageBucket = storageBucket; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }
    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public String getChecksumSha256() { return checksumSha256; }
    public void setChecksumSha256(String checksumSha256) { this.checksumSha256 = checksumSha256; }
    public String getSourceChecksumSha256() { return sourceChecksumSha256; }
    public void setSourceChecksumSha256(String sourceChecksumSha256) { this.sourceChecksumSha256 = sourceChecksumSha256; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isPreferred() { return preferred; }
    public void setPreferred(boolean preferred) { this.preferred = preferred; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
