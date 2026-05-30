package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.RobotsPolicy;
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
@Table(name = "ecommerce_seo_metadata")
public class EcommerceSeoMetadataEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_online_profile_id")
    private Long productOnlineProfileId;

    @Column(name = "online_category_id")
    private Long onlineCategoryId;

    @Column(name = "brand_id")
    private Long brandId;

    @Column(name = "seo_title", length = 90)
    private String seoTitle;

    @Column(name = "seo_description", length = 220)
    private String seoDescription;

    @Column(name = "canonical_path", length = 255)
    private String canonicalPath;

    @Enumerated(EnumType.STRING)
    @Column(name = "robots_policy", nullable = false, length = 30)
    private RobotsPolicy robotsPolicy;

    @Column(name = "indexable", nullable = false)
    private boolean indexable;

    @Column(name = "og_title", length = 120)
    private String ogTitle;

    @Column(name = "og_description", length = 260)
    private String ogDescription;

    @Column(name = "og_image_url", length = 1000)
    private String ogImageUrl;

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
    public Long getOnlineCategoryId() { return onlineCategoryId; }
    public void setOnlineCategoryId(Long onlineCategoryId) { this.onlineCategoryId = onlineCategoryId; }
    public Long getBrandId() { return brandId; }
    public void setBrandId(Long brandId) { this.brandId = brandId; }
    public String getSeoTitle() { return seoTitle; }
    public void setSeoTitle(String seoTitle) { this.seoTitle = seoTitle; }
    public String getSeoDescription() { return seoDescription; }
    public void setSeoDescription(String seoDescription) { this.seoDescription = seoDescription; }
    public String getCanonicalPath() { return canonicalPath; }
    public void setCanonicalPath(String canonicalPath) { this.canonicalPath = canonicalPath; }
    public RobotsPolicy getRobotsPolicy() { return robotsPolicy; }
    public void setRobotsPolicy(RobotsPolicy robotsPolicy) { this.robotsPolicy = robotsPolicy; }
    public boolean isIndexable() { return indexable; }
    public void setIndexable(boolean indexable) { this.indexable = indexable; }
    public String getOgTitle() { return ogTitle; }
    public void setOgTitle(String ogTitle) { this.ogTitle = ogTitle; }
    public String getOgDescription() { return ogDescription; }
    public void setOgDescription(String ogDescription) { this.ogDescription = ogDescription; }
    public String getOgImageUrl() { return ogImageUrl; }
    public void setOgImageUrl(String ogImageUrl) { this.ogImageUrl = ogImageUrl; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
