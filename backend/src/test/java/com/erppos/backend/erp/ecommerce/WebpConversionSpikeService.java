package com.erppos.backend.erp.ecommerce;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
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

final class WebpConversionSpikeService {
    private static final String WEBP_MIME_TYPE = "image/webp";

    ConversionResult convertToWebp(byte[] sourceBytes, float quality) {
        if (sourceBytes == null || sourceBytes.length == 0) {
            throw new IllegalArgumentException("sourceBytes is required");
        }
        if (quality <= 0.0f || quality > 1.0f) {
            throw new IllegalArgumentException("quality must be > 0 and <= 1");
        }

        long startUsedMemory = usedMemoryBytes();
        long start = System.nanoTime();
        BufferedImage source = readSourceImage(sourceBytes);
        byte[] webpBytes = writeWebp(source, quality);
        long elapsed = System.nanoTime() - start;
        long endUsedMemory = usedMemoryBytes();

        return new ConversionResult(
                webpBytes,
                WEBP_MIME_TYPE,
                source.getWidth(),
                source.getHeight(),
                webpBytes.length,
                sha256Hex(webpBytes),
                Duration.ofNanos(elapsed),
                endUsedMemory - startUsedMemory
        );
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
            throw new IllegalStateException("WebP conversion failed", ex);
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

    record ConversionResult(
            byte[] bytes,
            String mimeType,
            int width,
            int height,
            long sizeBytes,
            String checksumSha256,
            Duration elapsed,
            long usedMemoryDeltaBytes
    ) {
    }
}
