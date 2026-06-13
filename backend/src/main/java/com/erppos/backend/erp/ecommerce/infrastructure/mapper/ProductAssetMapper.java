package com.erppos.backend.erp.ecommerce.infrastructure.mapper;

import com.erppos.backend.erp.ecommerce.domain.model.ProductAsset;
import com.erppos.backend.erp.ecommerce.infrastructure.persistence.ProductAssetEntity;

public final class ProductAssetMapper {
    private ProductAssetMapper() {
    }

    public static ProductAsset toDomain(ProductAssetEntity entity) {
        return new ProductAsset(
                entity.getId(),
                entity.getProductOnlineProfileId(),
                entity.getAssetType(),
                entity.getAssetUrl(),
                entity.getAltText(),
                entity.getSource(),
                entity.isRightsConfirmed(),
                entity.isPrimary(),
                entity.isActive(),
                entity.getDisplayOrder(),
                entity.getStorageProvider(),
                entity.getStorageBucket(),
                entity.getStorageKey(),
                entity.getMimeType(),
                entity.getWidth(),
                entity.getHeight(),
                entity.getSizeBytes(),
                entity.getChecksumSha256(),
                entity.getOriginalFilename(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static ProductAssetEntity toEntity(ProductAsset asset) {
        ProductAssetEntity entity = new ProductAssetEntity();
        merge(entity, asset);
        return entity;
    }

    public static void merge(ProductAssetEntity entity, ProductAsset asset) {
        entity.setProductOnlineProfileId(asset.productOnlineProfileId());
        entity.setAssetType(asset.assetType());
        entity.setAssetUrl(asset.assetUrl());
        entity.setAltText(asset.altText());
        entity.setSource(asset.source());
        entity.setRightsConfirmed(asset.rightsConfirmed());
        entity.setPrimary(asset.primary());
        entity.setActive(asset.active());
        entity.setDisplayOrder(asset.displayOrder());
        entity.setStorageProvider(asset.storageProvider());
        entity.setStorageBucket(asset.storageBucket());
        entity.setStorageKey(asset.storageKey());
        entity.setMimeType(asset.mimeType());
        entity.setWidth(asset.width());
        entity.setHeight(asset.height());
        entity.setSizeBytes(asset.sizeBytes());
        entity.setChecksumSha256(asset.checksumSha256());
        entity.setOriginalFilename(asset.originalFilename());
        entity.setCreatedBy(asset.createdBy());
        entity.setUpdatedBy(asset.updatedBy());
    }
}
