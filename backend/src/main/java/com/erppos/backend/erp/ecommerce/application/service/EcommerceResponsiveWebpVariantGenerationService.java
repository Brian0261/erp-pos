package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import org.springframework.stereotype.Service;

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
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

@Service
public class EcommerceResponsiveWebpVariantGenerationService {
    private static final String WEBP_MIME_TYPE = "image/webp";
    private static final float DEFAULT_WEBP_QUALITY = 0.82f;
    private static final List<Integer> TARGET_WIDTHS = List.of(320, 640, 960, 1280);

    private final EcommerceProductImageBinaryService productImageBinaryService;

    public EcommerceResponsiveWebpVariantGenerationService(EcommerceProductImageBinaryService productImageBinaryService) {
        this.productImageBinaryService = productImageBinaryService;
    }

    public List<GeneratedResponsiveWebpVariant> generateResponsiveVariants(
            byte[] sourceBytes,
            EcommerceProductImageBinaryService.ValidatedProductImage sourceImage
    ) {
        if (sourceImage == null || WEBP_MIME_TYPE.equals(sourceImage.mimeType())) {
            return List.of();
        }
        if (!"image/jpeg".equals(sourceImage.mimeType()) && !"image/png".equals(sourceImage.mimeType())) {
            return List.of();
        }

        BufferedImage source = readSourceImage(sourceBytes);
        List<GeneratedResponsiveWebpVariant> variants = new ArrayList<>();
        for (int i = 0; i < TARGET_WIDTHS.size(); i++) {
            int targetWidth = TARGET_WIDTHS.get(i);
            if (source.getWidth() < targetWidth) {
                continue;
            }
            BufferedImage resized = resizeToWidth(source, targetWidth);
            byte[] webpBytes = writeWebp(resized, DEFAULT_WEBP_QUALITY);
            EcommerceProductImageBinaryService.ValidatedProductImage webp = productImageBinaryService.validate(
                    webpBytes,
                    WEBP_MIME_TYPE,
                    responsiveFilename(sourceImage.originalFilename(), targetWidth)
            );
            variants.add(new GeneratedResponsiveWebpVariant(
                    webpBytes,
                    webp.mimeType(),
                    targetWidth,
                    webp.width(),
                    webp.height(),
                    webp.sizeBytes(),
                    webp.checksumSha256(),
                    sourceImage.checksumSha256(),
                    i,
                    webp.originalFilename()
            ));
        }
        return List.copyOf(variants);
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
            throw new EcommerceBusinessRuleException("Responsive WebP variant generation failed");
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

    private String responsiveFilename(String originalFilename, int targetWidth) {
        String value = originalFilename == null ? "primary" : originalFilename.trim();
        int dotIndex = value.lastIndexOf('.');
        if (dotIndex > 0) {
            value = value.substring(0, dotIndex);
        }
        return value.isBlank() ? "primary-" + targetWidth + "w.webp" : value + "-" + targetWidth + "w.webp";
    }

    public record GeneratedResponsiveWebpVariant(
            byte[] bytes,
            String mimeType,
            int targetWidth,
            int width,
            int height,
            long sizeBytes,
            String checksumSha256,
            String sourceChecksumSha256,
            int sortOrder,
            String originalFilename
    ) {
    }
}
