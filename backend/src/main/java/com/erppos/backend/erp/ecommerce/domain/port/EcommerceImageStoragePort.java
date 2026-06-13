package com.erppos.backend.erp.ecommerce.domain.port;

public interface EcommerceImageStoragePort {
    StoredEcommerceImage store(EcommerceImageStorageObject object);

    record EcommerceImageStorageObject(
            String storageKey,
            byte[] bytes,
            String mimeType,
            long sizeBytes,
            String checksumSha256,
            String originalFilename
    ) {
    }

    record StoredEcommerceImage(
            String provider,
            String bucket,
            String storageKey,
            String publicUrl
    ) {
    }
}
