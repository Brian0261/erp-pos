package com.erppos.backend.erp.ecommerce.infrastructure.mapper;

import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductOnlineProfileEntity;

public final class ProductOnlineProfileMapper {
    private ProductOnlineProfileMapper() {
    }

    public static ProductOnlineProfile toDomain(ProductOnlineProfileEntity entity) {
        return new ProductOnlineProfile(
                entity.getId(),
                entity.getProductId(),
                entity.getPublicationStatus(),
                entity.getSlug(),
                entity.getOnlineName(),
                entity.getOnlineDescription(),
                entity.getOnlineCategoryId(),
                entity.getBrandId(),
                entity.getBrandAbsencePolicy(),
                entity.getPublishedAt(),
                entity.getUnpublishedAt(),
                entity.getVersion(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static ProductOnlineProfileEntity toEntity(ProductOnlineProfile profile) {
        ProductOnlineProfileEntity entity = new ProductOnlineProfileEntity();
        merge(entity, profile);
        return entity;
    }

    public static void merge(ProductOnlineProfileEntity entity, ProductOnlineProfile profile) {
        entity.setProductId(profile.productId());
        entity.setPublicationStatus(profile.publicationStatus());
        entity.setSlug(profile.slug());
        entity.setOnlineName(profile.onlineName());
        entity.setOnlineDescription(profile.onlineDescription());
        entity.setOnlineCategoryId(profile.onlineCategoryId());
        entity.setBrandId(profile.brandId());
        entity.setBrandAbsencePolicy(profile.brandAbsencePolicy());
        entity.setPublishedAt(profile.publishedAt());
        entity.setUnpublishedAt(profile.unpublishedAt());
        entity.setCreatedBy(profile.createdBy());
        entity.setUpdatedBy(profile.updatedBy());
    }
}
