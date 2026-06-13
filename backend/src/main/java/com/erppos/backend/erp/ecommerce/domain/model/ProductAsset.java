package com.erppos.backend.erp.ecommerce.domain.model;

import java.time.Instant;

public record ProductAsset(
        Long id,
        Long productOnlineProfileId,
        AssetType assetType,
        String assetUrl,
        String altText,
        AssetSource source,
        boolean rightsConfirmed,
        boolean primary,
        boolean active,
        int displayOrder,
        String storageProvider,
        String storageBucket,
        String storageKey,
        String mimeType,
        Integer width,
        Integer height,
        Long sizeBytes,
        String checksumSha256,
        String originalFilename,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
    public ProductAsset(
            Long id,
            Long productOnlineProfileId,
            AssetType assetType,
            String assetUrl,
            String altText,
            AssetSource source,
            boolean rightsConfirmed,
            boolean primary,
            boolean active,
            int displayOrder,
            Instant createdAt,
            Instant updatedAt,
            String createdBy,
            String updatedBy
    ) {
        this(
                id,
                productOnlineProfileId,
                assetType,
                assetUrl,
                altText,
                source,
                rightsConfirmed,
                primary,
                active,
                displayOrder,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                createdAt,
                updatedAt,
                createdBy,
                updatedBy
        );
    }
}
