package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.BrandAbsencePolicy;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
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
import jakarta.persistence.Version;

import java.time.Instant;

@Entity
@Table(name = "ecommerce_product_online_profiles")
public class ProductOnlineProfileEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "publication_status", nullable = false, length = 30)
    private OnlinePublicationStatus publicationStatus;

    @Column(name = "slug", length = 180)
    private String slug;

    @Column(name = "online_name", length = 180)
    private String onlineName;

    @Column(name = "online_description", length = 2000)
    private String onlineDescription;

    @Column(name = "online_category_id")
    private Long onlineCategoryId;

    @Column(name = "brand_id")
    private Long brandId;

    @Enumerated(EnumType.STRING)
    @Column(name = "brand_absence_policy", length = 30)
    private BrandAbsencePolicy brandAbsencePolicy;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "unpublished_at")
    private Instant unpublishedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

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
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public OnlinePublicationStatus getPublicationStatus() { return publicationStatus; }
    public void setPublicationStatus(OnlinePublicationStatus publicationStatus) { this.publicationStatus = publicationStatus; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getOnlineName() { return onlineName; }
    public void setOnlineName(String onlineName) { this.onlineName = onlineName; }
    public String getOnlineDescription() { return onlineDescription; }
    public void setOnlineDescription(String onlineDescription) { this.onlineDescription = onlineDescription; }
    public Long getOnlineCategoryId() { return onlineCategoryId; }
    public void setOnlineCategoryId(Long onlineCategoryId) { this.onlineCategoryId = onlineCategoryId; }
    public Long getBrandId() { return brandId; }
    public void setBrandId(Long brandId) { this.brandId = brandId; }
    public BrandAbsencePolicy getBrandAbsencePolicy() { return brandAbsencePolicy; }
    public void setBrandAbsencePolicy(BrandAbsencePolicy brandAbsencePolicy) { this.brandAbsencePolicy = brandAbsencePolicy; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Instant getUnpublishedAt() { return unpublishedAt; }
    public void setUnpublishedAt(Instant unpublishedAt) { this.unpublishedAt = unpublishedAt; }
    public Long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
