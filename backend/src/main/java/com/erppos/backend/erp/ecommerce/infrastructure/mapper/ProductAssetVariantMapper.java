package com.erppos.backend.erp.ecommerce.infrastructure.mapper;

import com.erppos.backend.erp.ecommerce.domain.model.ProductAssetVariant;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetVariantEntity;

public final class ProductAssetVariantMapper {
    private ProductAssetVariantMapper() {
    }

    public static ProductAssetVariant toDomain(ProductAssetVariantEntity entity) {
        return new ProductAssetVariant(
                entity.getId(),
                entity.getProductAssetId(),
                entity.getVariantKind(),
                entity.getAssetUrl(),
                entity.getStorageProvider(),
                entity.getStorageBucket(),
                entity.getStorageKey(),
                entity.getMimeType(),
                entity.getWidth(),
                entity.getHeight(),
                entity.getSizeBytes(),
                entity.getChecksumSha256(),
                entity.getSourceChecksumSha256(),
                entity.isActive(),
                entity.isPreferred(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static ProductAssetVariantEntity toEntity(ProductAssetVariant variant) {
        ProductAssetVariantEntity entity = new ProductAssetVariantEntity();
        merge(entity, variant);
        return entity;
    }

    public static void merge(ProductAssetVariantEntity entity, ProductAssetVariant variant) {
        entity.setProductAssetId(variant.productAssetId());
        entity.setVariantKind(variant.variantKind());
        entity.setAssetUrl(variant.assetUrl());
        entity.setStorageProvider(variant.storageProvider());
        entity.setStorageBucket(variant.storageBucket());
        entity.setStorageKey(variant.storageKey());
        entity.setMimeType(variant.mimeType());
        entity.setWidth(variant.width());
        entity.setHeight(variant.height());
        entity.setSizeBytes(variant.sizeBytes());
        entity.setChecksumSha256(variant.checksumSha256());
        entity.setSourceChecksumSha256(variant.sourceChecksumSha256());
        entity.setActive(variant.active());
        entity.setPreferred(variant.preferred());
        entity.setCreatedBy(variant.createdBy());
        entity.setUpdatedBy(variant.updatedBy());
    }
}
