package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Optional;

@Service
public class EcommerceWebpDerivativeGenerationService {
    private static final String WEBP_MIME_TYPE = "image/webp";
    private static final float DEFAULT_WEBP_QUALITY = 0.82f;

    private final EcommerceProductImageBinaryService productImageBinaryService;

    public EcommerceWebpDerivativeGenerationService(EcommerceProductImageBinaryService productImageBinaryService) {
        this.productImageBinaryService = productImageBinaryService;
    }

    public Optional<GeneratedWebpDerivative> generatePreferredDerivative(
            byte[] sourceBytes,
            EcommerceProductImageBinaryService.ValidatedProductImage sourceImage
    ) {
        if (sourceImage == null || WEBP_MIME_TYPE.equals(sourceImage.mimeType())) {
            return Optional.empty();
        }
        if (!"image/jpeg".equals(sourceImage.mimeType()) && !"image/png".equals(sourceImage.mimeType())) {
            return Optional.empty();
        }

        byte[] webpBytes = writeWebp(readSourceImage(sourceBytes), DEFAULT_WEBP_QUALITY);
        EcommerceProductImageBinaryService.ValidatedProductImage webp = productImageBinaryService.validate(
                webpBytes,
                WEBP_MIME_TYPE,
                derivativeFilename(sourceImage.originalFilename())
        );
        if (webp.sizeBytes() >= sourceImage.sizeBytes()) {
            return Optional.empty();
        }
        return Optional.of(new GeneratedWebpDerivative(
                webpBytes,
                webp.mimeType(),
                webp.width(),
                webp.height(),
                webp.sizeBytes(),
                webp.checksumSha256(),
                sourceImage.checksumSha256(),
                true,
                webp.originalFilename()
        ));
    }

    private BufferedImage readSourceImage(byte[] sourceBytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(sourceBytes));
            if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
                throw new EcommerceBusinessRuleException("Image dimensions could not be read");
            }
            return image;
        } catch (IOException ex) {
            throw new EcommerceBusinessRuleException("Image file is invalid");
        }
    }

    private byte[] writeWebp(BufferedImage source, float quality) {
        ImageIO.scanForPlugins();
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByMIMEType(WEBP_MIME_TYPE);
        if (!writers.hasNext()) {
            throw new EcommerceBusinessRuleException("WebP image writer is not available");
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
            throw new EcommerceBusinessRuleException("WebP derivative generation failed");
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

    private String derivativeFilename(String originalFilename) {
        String value = originalFilename == null ? "primary" : originalFilename.trim();
        int dotIndex = value.lastIndexOf('.');
        if (dotIndex > 0) {
            value = value.substring(0, dotIndex);
        }
        return value.isBlank() ? "primary.webp" : value + ".webp";
    }

    public record GeneratedWebpDerivative(
            byte[] bytes,
            String mimeType,
            int width,
            int height,
            long sizeBytes,
            String checksumSha256,
            String sourceChecksumSha256,
            boolean preferred,
            String originalFilename
    ) {
    }
}
