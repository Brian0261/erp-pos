package com.erppos.backend.erp.ecommerce.infrastructure.mapper;

import com.erppos.backend.erp.ecommerce.domain.model.EcommerceSeoMetadata;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.EcommerceSeoMetadataEntity;

public final class EcommerceSeoMetadataMapper {
    private EcommerceSeoMetadataMapper() {
    }

    public static EcommerceSeoMetadata toDomain(EcommerceSeoMetadataEntity entity) {
        return new EcommerceSeoMetadata(
                entity.getId(),
                entity.getProductOnlineProfileId(),
                entity.getOnlineCategoryId(),
                entity.getBrandId(),
                entity.getSeoTitle(),
                entity.getSeoDescription(),
                entity.getCanonicalPath(),
                entity.getRobotsPolicy(),
                entity.isIndexable(),
                entity.getOgTitle(),
                entity.getOgDescription(),
                entity.getOgImageUrl(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static EcommerceSeoMetadataEntity toEntity(EcommerceSeoMetadata metadata) {
        EcommerceSeoMetadataEntity entity = new EcommerceSeoMetadataEntity();
        merge(entity, metadata);
        return entity;
    }

    public static void merge(EcommerceSeoMetadataEntity entity, EcommerceSeoMetadata metadata) {
        entity.setProductOnlineProfileId(metadata.productOnlineProfileId());
        entity.setOnlineCategoryId(metadata.onlineCategoryId());
        entity.setBrandId(metadata.brandId());
        entity.setSeoTitle(metadata.seoTitle());
        entity.setSeoDescription(metadata.seoDescription());
        entity.setCanonicalPath(metadata.canonicalPath());
        entity.setRobotsPolicy(metadata.robotsPolicy());
        entity.setIndexable(metadata.indexable());
        entity.setOgTitle(metadata.ogTitle());
        entity.setOgDescription(metadata.ogDescription());
        entity.setOgImageUrl(metadata.ogImageUrl());
        entity.setCreatedBy(metadata.createdBy());
        entity.setUpdatedBy(metadata.updatedBy());
    }
}
