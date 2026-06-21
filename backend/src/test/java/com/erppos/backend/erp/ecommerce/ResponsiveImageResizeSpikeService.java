package com.erppos.backend.erp.ecommerce;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.Locale;
import java.util.Optional;

final class ResponsiveImageResizeSpikeService {
    private static final String WEBP_MIME_TYPE = "image/webp";
    private static final float DEFAULT_WEBP_QUALITY = 0.82f;

    Optional<ResponsiveVariant> resizeToWebp(byte[] sourceBytes, int targetWidth) {
        if (sourceBytes == null || sourceBytes.length == 0) {
            throw new IllegalArgumentException("sourceBytes is required");
        }
        if (targetWidth <= 0) {
            throw new IllegalArgumentException("targetWidth must be positive");
        }

        BufferedImage source = readSourceImage(sourceBytes);
        if (source.getWidth() < targetWidth) {
            return Optional.empty();
        }

        long startUsedMemory = usedMemoryBytes();
        long start = System.nanoTime();
        BufferedImage resized = resizeToWidth(source, targetWidth);
        byte[] webpBytes = writeWebp(resized, DEFAULT_WEBP_QUALITY);
        long elapsed = System.nanoTime() - start;
        long endUsedMemory = usedMemoryBytes();

        return Optional.of(new ResponsiveVariant(
                targetWidth,
                resized.getWidth(),
                resized.getHeight(),
                WEBP_MIME_TYPE,
                webpBytes.length,
                sha256Hex(webpBytes),
                Duration.ofNanos(elapsed),
                endUsedMemory - startUsedMemory,
                webpBytes
        ));
    }

    private BufferedImage readSourceImage(byte[] sourceBytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(sourceBytes));
            if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
                throw new IllegalArgumentException("source image dimensions could not be read");
            }
            return image;
        } catch (IOException ex) {
            throw new IllegalArgumentException("source image is invalid", ex);
        }
    }

    private BufferedImage resizeToWidth(BufferedImage source, int targetWidth) {
        int targetHeight = Math.max(1, Math.round((float) source.getHeight() * targetWidth / source.getWidth()));
        int imageType = source.getColorModel().hasAlpha()
                ? BufferedImage.TYPE_INT_ARGB
                : BufferedImage.TYPE_INT_RGB;
        BufferedImage resized = new BufferedImage(targetWidth, targetHeight, imageType);
        Graphics2D graphics = resized.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }
        return resized;
    }

    private byte[] writeWebp(BufferedImage source, float quality) {
        ImageIO.scanForPlugins();
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByMIMEType(WEBP_MIME_TYPE);
        if (!writers.hasNext()) {
            throw new IllegalStateException("No ImageIO WebP writer is available");
        }

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
             ImageOutputStream output = ImageIO.createImageOutputStream(bytes)) {
            writer.setOutput(output);
            ImageWriteParam param = writer.getDefaultWriteParam();
            configureCompression(param, quality);
            writer.write(null, new IIOImage(source, null, null), param);
            output.flush();
            return bytes.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("WebP resize spike failed", ex);
        } finally {
            writer.dispose();
        }
    }

    private void configureCompression(ImageWriteParam param, float quality) {
        if (!param.canWriteCompressed()) {
            return;
        }
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        String[] compressionTypes = param.getCompressionTypes();
        if (compressionTypes != null && compressionTypes.length > 0) {
            param.setCompressionType(preferredCompressionType(compressionTypes));
        }
        param.setCompressionQuality(quality);
    }

    private String preferredCompressionType(String[] compressionTypes) {
        for (String compressionType : compressionTypes) {
            if (compressionType != null && compressionType.toLowerCase(Locale.ROOT).contains("lossy")) {
                return compressionType;
            }
        }
        return compressionTypes[0];
    }

    private String sha256Hex(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 digest is not available", ex);
        }
    }

    private long usedMemoryBytes() {
        Runtime runtime = Runtime.getRuntime();
        return runtime.totalMemory() - runtime.freeMemory();
    }

    record ResponsiveVariant(
            int targetWidth,
            int width,
            int height,
            String mimeType,
            long sizeBytes,
            String checksumSha256,
            Duration elapsed,
            long usedMemoryDeltaBytes,
            byte[] bytes
    ) {
    }
}
