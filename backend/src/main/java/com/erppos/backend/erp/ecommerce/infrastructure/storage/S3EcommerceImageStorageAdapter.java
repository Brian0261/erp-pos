package com.erppos.backend.erp.ecommerce.infrastructure.storage;

import com.erppos.backend.erp.ecommerce.application.service.EcommerceImageStorageProperties;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceImageStoragePort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.HashMap;
import java.util.Map;

@Component
@ConditionalOnProperty(prefix = "app.ecommerce.image-storage", name = "provider", havingValue = "s3")
public class S3EcommerceImageStorageAdapter implements EcommerceImageStoragePort {
    private final S3Client s3Client;
    private final EcommerceImageStorageProperties properties;

    public S3EcommerceImageStorageAdapter(S3Client s3Client, EcommerceImageStorageProperties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    @Override
    public StoredEcommerceImage store(EcommerceImageStorageObject object) {
        String bucket = requireConfigured(properties.getBucket(), "ECOMMERCE_IMAGE_S3_BUCKET is required");
        String publicBaseUrl = requireConfigured(properties.getPublicBaseUrl(), "ECOMMERCE_IMAGE_PUBLIC_BASE_URL is required");

        PutObjectRequest.Builder request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(object.storageKey())
                .contentType(object.mimeType())
                .contentLength(object.sizeBytes())
                .metadata(buildMetadata(object));

        String cacheControl = trimToNull(properties.getCacheControl());
        if (cacheControl != null) {
            request.cacheControl(cacheControl);
        }

        s3Client.putObject(request.build(), RequestBody.fromBytes(object.bytes()));
        return new StoredEcommerceImage("S3", bucket, object.storageKey(), buildPublicUrl(publicBaseUrl, object.storageKey()));
    }

    @Override
    public void delete(String storageKey) {
        String key = trimToNull(storageKey);
        if (key == null) {
            return;
        }
        String bucket = requireConfigured(properties.getBucket(), "ECOMMERCE_IMAGE_S3_BUCKET is required");
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    private Map<String, String> buildMetadata(EcommerceImageStorageObject object) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("checksum-sha256", object.checksumSha256());
        return metadata;
    }

    private String buildPublicUrl(String publicBaseUrl, String storageKey) {
        String base = requireConfigured(publicBaseUrl, "ECOMMERCE_IMAGE_PUBLIC_BASE_URL is required");
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/" + storageKey;
    }

    private String requireConfigured(String value, String message) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            throw new EcommerceBusinessRuleException(message);
        }
        return trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
