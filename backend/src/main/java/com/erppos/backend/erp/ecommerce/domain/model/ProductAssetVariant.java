package com.erppos.backend.erp.ecommerce.domain.model;

import java.time.Instant;

public record ProductAssetVariant(
        Long id,
        Long productAssetId,
        ProductAssetVariantKind variantKind,
        ProductAssetVariantFormat format,
        ProductAssetVariantPurpose purpose,
        int targetWidth,
        int sortOrder,
        String assetUrl,
        String storageProvider,
        String storageBucket,
        String storageKey,
        String mimeType,
        int width,
        int height,
        long sizeBytes,
        String checksumSha256,
        String sourceChecksumSha256,
        boolean active,
        boolean preferred,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
    public ProductAssetVariant(
            Long id,
            Long productAssetId,
            ProductAssetVariantKind variantKind,
            String assetUrl,
            String storageProvider,
            String storageBucket,
            String storageKey,
            String mimeType,
            int width,
            int height,
            long sizeBytes,
            String checksumSha256,
            String sourceChecksumSha256,
            boolean active,
            boolean preferred,
            Instant createdAt,
            Instant updatedAt,
            String createdBy,
            String updatedBy
    ) {
        this(
                id,
                productAssetId,
                variantKind,
                ProductAssetVariantFormat.WEBP,
                ProductAssetVariantPurpose.PRIMARY,
                width,
                0,
                assetUrl,
                storageProvider,
                storageBucket,
                storageKey,
                mimeType,
                width,
                height,
                sizeBytes,
                checksumSha256,
                sourceChecksumSha256,
                active,
                preferred,
                createdAt,
                updatedAt,
                createdBy,
                updatedBy
        );
    }
}
