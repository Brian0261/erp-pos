package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceImageStoragePort;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;

@Service
public class EcommerceProductImageBinaryService {
    private static final long DEFAULT_IMAGE_MAX_SIZE_BYTES = 5L * 1024L * 1024L;
    private static final int DEFAULT_IMAGE_MAX_DIMENSION = 6000;
    private static final int CHECKSUM_STORAGE_SUFFIX_LENGTH = 12;
    private static final Set<String> ALLOWED_UPLOAD_MIME_TYPES = Set.of("image/jpeg", "image/png");

    private final EcommerceImageStoragePort imageStoragePort;
    private final EcommerceImageStorageProperties imageStorageProperties;
    private final PublicImageUrlPolicy publicImageUrlPolicy;

    public EcommerceProductImageBinaryService(
            EcommerceImageStoragePort imageStoragePort,
            EcommerceImageStorageProperties imageStorageProperties,
            PublicImageUrlPolicy publicImageUrlPolicy
    ) {
        this.imageStoragePort = imageStoragePort;
        this.imageStorageProperties = imageStorageProperties;
        this.publicImageUrlPolicy = publicImageUrlPolicy;
    }

    public ValidatedProductImage validate(byte[] fileBytes, String declaredContentType, String originalFilename) {
        if (fileBytes == null || fileBytes.length == 0) {
            throw new EcommerceBusinessRuleException("Image file is required");
        }
        long maxSizeBytes = configuredMaxImageSizeBytes();
        if (fileBytes.length > maxSizeBytes) {
            throw new EcommerceBusinessRuleException("Image file max size is " + maxSizeBytes + " bytes");
        }

        String extension = extensionFromFilename(originalFilename);
        if (extension == null) {
            throw new EcommerceBusinessRuleException("Only .jpg, .jpeg and .png image files are supported");
        }

        String declaredMimeType = normalizeMimeType(declaredContentType);
        if (declaredMimeType != null && !ALLOWED_UPLOAD_MIME_TYPES.contains(declaredMimeType)) {
            throw new EcommerceBusinessRuleException("Only JPEG and PNG product images are supported");
        }
        String detectedMimeType = detectImageMimeType(fileBytes);
        if (detectedMimeType == null) {
            throw new EcommerceBusinessRuleException("Only JPEG and PNG product images are supported");
        }
        if (declaredMimeType != null && !declaredMimeType.equals(detectedMimeType)) {
            throw new EcommerceBusinessRuleException("Image content type does not match file content");
        }
        if (!extensionForMimeType(detectedMimeType).equals(extension)) {
            throw new EcommerceBusinessRuleException("Image extension does not match file content");
        }

        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(fileBytes));
        } catch (IOException ex) {
            throw new EcommerceBusinessRuleException("Image file is invalid");
        }
        if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
            throw new EcommerceBusinessRuleException("Image dimensions could not be read");
        }
        int maxWidth = configuredMaxImageWidth();
        int maxHeight = configuredMaxImageHeight();
        if (image.getWidth() > maxWidth || image.getHeight() > maxHeight) {
            throw new EcommerceBusinessRuleException("Image dimensions max are " + maxWidth + "x" + maxHeight + " px");
        }

        return new ValidatedProductImage(
                detectedMimeType,
                extension,
                image.getWidth(),
                image.getHeight(),
                fileBytes.length,
                sha256Hex(fileBytes),
                sanitizeOriginalFilename(originalFilename)
        );
    }

    public StoredProductImage store(
            ProductOnlineProfile profile,
            String productName,
            byte[] fileBytes,
            String originalFilename,
            String declaredContentType
    ) {
        ValidatedProductImage image = validate(fileBytes, declaredContentType, originalFilename);
        String storageKey = buildStorageKey(profile, productName, image.checksumSha256(), image.extension());
        validateExpectedPublicImageUrl(storageKey);

        EcommerceImageStoragePort.StoredEcommerceImage storedImage = imageStoragePort.store(new EcommerceImageStoragePort.EcommerceImageStorageObject(
                storageKey,
                fileBytes,
                image.mimeType(),
                image.sizeBytes(),
                image.checksumSha256(),
                image.originalFilename()
        ));
        if (storedImage == null) {
            throw new EcommerceBusinessRuleException("Image storage did not return a result");
        }
        String assetUrl = trimToNull(storedImage.publicUrl());
        if (assetUrl == null) {
            throw new EcommerceBusinessRuleException("Image storage did not return a public URL");
        }
        PublicImageUrlPolicy.ValidationResult imageUrlValidation = publicImageUrlPolicy.validate(assetUrl);
        if (!imageUrlValidation.valid()) {
            throw new EcommerceBusinessRuleException(imageUrlValidation.message());
        }

        return new StoredProductImage(
                trimToNull(storedImage.provider()),
                trimToNull(storedImage.bucket()),
                trimToNull(storedImage.storageKey()),
                assetUrl,
                image.mimeType(),
                image.width(),
                image.height(),
                image.sizeBytes(),
                image.checksumSha256(),
                image.originalFilename()
        );
    }

    public void cleanupBestEffort(String storageKey) {
        try {
            imageStoragePort.delete(storageKey);
        } catch (RuntimeException ignored) {
            // Best-effort cleanup must not hide the original import failure.
        }
    }

    private String detectImageMimeType(byte[] fileBytes) {
        if (startsWith(fileBytes, 0xFF, 0xD8, 0xFF)) {
            return "image/jpeg";
        }
        if (startsWith(fileBytes, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return "image/png";
        }
        return null;
    }

    private boolean startsWith(byte[] bytes, int... signature) {
        if (bytes.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if ((bytes[i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private String normalizeMimeType(String contentType) {
        String value = trimToNull(contentType);
        if (value == null) {
            return null;
        }
        int semicolonIndex = value.indexOf(';');
        if (semicolonIndex >= 0) {
            value = value.substring(0, semicolonIndex);
        }
        value = value.trim().toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(value) || "image/pjpeg".equals(value)) {
            return "image/jpeg";
        }
        if ("image/x-png".equals(value)) {
            return "image/png";
        }
        return value;
    }

    private String extensionFromFilename(String originalFilename) {
        String value = trimToNull(originalFilename);
        if (value == null) {
            return null;
        }
        int slashIndex = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
        if (slashIndex >= 0) {
            value = value.substring(slashIndex + 1);
        }
        int dotIndex = value.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == value.length() - 1) {
            return null;
        }
        String extension = value.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        if ("jpeg".equals(extension)) {
            return "jpg";
        }
        return "jpg".equals(extension) || "png".equals(extension) ? extension : null;
    }

    private String extensionForMimeType(String mimeType) {
        return "image/png".equals(mimeType) ? "png" : "jpg";
    }

    private String sha256Hex(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 digest is not available", ex);
        }
    }

    private String buildStorageKey(ProductOnlineProfile profile, String productName, String checksumSha256, String extension) {
        String baseSlug = normalizeSlug(firstNonBlank(profile.slug(), profile.onlineName(), productName, "main"));
        if (baseSlug == null) {
            baseSlug = "main";
        }
        String checksumSuffix = checksumSha256.substring(0, Math.min(CHECKSUM_STORAGE_SUFFIX_LENGTH, checksumSha256.length()));
        String key = "ecommerce/products/%d/profiles/%d/main/%s-%s.%s".formatted(
                profile.productId(),
                profile.id(),
                baseSlug,
                checksumSuffix,
                extension
        );
        String prefix = normalizeStoragePrefix(imageStorageProperties.getPrefix());
        return prefix == null ? key : prefix + "/" + key;
    }

    private void validateExpectedPublicImageUrl(String storageKey) {
        String publicBaseUrl = trimToNull(imageStorageProperties.getPublicBaseUrl());
        if (publicBaseUrl == null) {
            return;
        }
        String expectedUrl = buildPublicUrl(publicBaseUrl, storageKey);
        PublicImageUrlPolicy.ValidationResult validation = publicImageUrlPolicy.validate(expectedUrl);
        if (!validation.valid()) {
            throw new EcommerceBusinessRuleException(validation.message());
        }
    }

    private String buildPublicUrl(String publicBaseUrl, String storageKey) {
        String base = trimToNull(publicBaseUrl);
        if (base == null) {
            return storageKey;
        }
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/" + storageKey;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            String normalized = trimToNull(value);
            if (normalized != null) {
                return normalized;
            }
        }
        return null;
    }

    private String normalizeStoragePrefix(String prefix) {
        String normalized = trimToNull(prefix);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.contains("..") || normalized.contains("//") || !normalized.matches("[A-Za-z0-9/_-]+")) {
            throw new EcommerceBusinessRuleException("ECOMMERCE_IMAGE_S3_PREFIX is invalid");
        }
        return normalized;
    }

    private String sanitizeOriginalFilename(String originalFilename) {
        String value = trimToNull(originalFilename);
        if (value == null) {
            return null;
        }
        value = value.replace('\\', '/');
        int slashIndex = value.lastIndexOf('/');
        if (slashIndex >= 0) {
            value = value.substring(slashIndex + 1);
        }
        value = value.replaceAll("\\p{Cntrl}", "").trim();
        if (value.length() > 255) {
            value = value.substring(0, 255);
        }
        return trimToNull(value);
    }

    private String normalizeSlug(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }

        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+", "")
                .replaceAll("-+$", "")
                .replaceAll("-{2,}", "-");
        return normalized.isBlank() ? null : normalized;
    }

    private long configuredMaxImageSizeBytes() {
        long configured = imageStorageProperties.getMaxSizeBytes();
        return configured > 0 ? configured : DEFAULT_IMAGE_MAX_SIZE_BYTES;
    }

    private int configuredMaxImageWidth() {
        int configured = imageStorageProperties.getMaxWidth();
        return configured > 0 ? configured : DEFAULT_IMAGE_MAX_DIMENSION;
    }

    private int configuredMaxImageHeight() {
        int configured = imageStorageProperties.getMaxHeight();
        return configured > 0 ? configured : DEFAULT_IMAGE_MAX_DIMENSION;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record ValidatedProductImage(
            String mimeType,
            String extension,
            int width,
            int height,
            long sizeBytes,
            String checksumSha256,
            String originalFilename
    ) {
    }

    public record StoredProductImage(
            String provider,
            String bucket,
            String storageKey,
            String publicUrl,
            String mimeType,
            int width,
            int height,
            long sizeBytes,
            String checksumSha256,
            String originalFilename
    ) {
    }
}
