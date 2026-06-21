package com.erppos.backend.erp.ecommerce;

import com.erppos.backend.erp.ecommerce.application.service.EcommerceImageStorageProperties;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceProductImageBinaryService;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceWebpDerivativeGenerationService;
import com.erppos.backend.erp.ecommerce.application.service.PublicImageUrlPolicy;
import com.erppos.backend.erp.ecommerce.application.service.PublicImageUrlProperties;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ResponsiveImageResizeSpikeServiceTest {
    private static final List<Integer> RESPONSIVE_TARGET_WIDTHS = List.of(320, 640, 960, 1280);

    private final ResponsiveImageResizeSpikeService service = new ResponsiveImageResizeSpikeService();
    private final EcommerceProductImageBinaryService imageValidator = new EcommerceProductImageBinaryService(
            object -> null,
            new EcommerceImageStorageProperties(),
            new PublicImageUrlPolicy(new PublicImageUrlProperties())
    );
    private final EcommerceWebpDerivativeGenerationService currentWebpDerivativeService = new EcommerceWebpDerivativeGenerationService(imageValidator);

    @Test
    void shouldGenerateResponsiveWebpVariantsFromJpegForValidTargetWidths() throws IOException {
        byte[] jpeg = jpegFixture(1600, 1200);
        EcommerceProductImageBinaryService.ValidatedProductImage original = imageValidator.validate(
                jpeg,
                "image/jpeg",
                "responsive-source.jpg"
        );
        EcommerceWebpDerivativeGenerationService.GeneratedWebpDerivative currentFullSizeWebp = currentWebpDerivativeService
                .generatePreferredDerivative(jpeg, original)
                .orElseThrow();

        for (int targetWidth : RESPONSIVE_TARGET_WIDTHS) {
            ResponsiveImageResizeSpikeService.ResponsiveVariant variant = service.resizeToWebp(jpeg, targetWidth).orElseThrow();
            EcommerceProductImageBinaryService.ValidatedProductImage validated = imageValidator.validate(
                    variant.bytes(),
                    "image/webp",
                    "responsive-%dw.webp".formatted(targetWidth)
            );

            assertEquals(targetWidth, variant.targetWidth());
            assertEquals(targetWidth, variant.width());
            assertEquals(Math.round((float) original.height() * targetWidth / original.width()), variant.height());
            assertEquals("image/webp", variant.mimeType());
            assertEquals("image/webp", validated.mimeType());
            assertEquals(variant.width(), validated.width());
            assertEquals(variant.height(), validated.height());
            assertEquals(variant.sizeBytes(), variant.bytes().length);
            assertEquals(64, variant.checksumSha256().length());
            assertEquals(variant.checksumSha256(), validated.checksumSha256());
            assertTrue(variant.sizeBytes() > 0);
            assertTrue(variant.elapsed().toMillis() < 10_000);
            assertTrue(variant.sizeBytes() < original.sizeBytes());
            assertTrue(variant.sizeBytes() < currentFullSizeWebp.sizeBytes());
            assertWebpContainer(variant.bytes());

            printStats("JPEG", original.sizeBytes(), currentFullSizeWebp.sizeBytes(), variant);
        }
    }

    @Test
    void shouldGenerateResponsiveWebpVariantsFromTransparentPngAndPreserveAlpha() throws IOException {
        byte[] png = transparentPngFixture(800, 800);
        EcommerceProductImageBinaryService.ValidatedProductImage original = imageValidator.validate(
                png,
                "image/png",
                "transparent-source.png"
        );

        for (int targetWidth : List.of(320, 640)) {
            ResponsiveImageResizeSpikeService.ResponsiveVariant variant = service.resizeToWebp(png, targetWidth).orElseThrow();
            EcommerceProductImageBinaryService.ValidatedProductImage validated = imageValidator.validate(
                    variant.bytes(),
                    "image/webp",
                    "transparent-%dw.webp".formatted(targetWidth)
            );
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(variant.bytes()));

            assertNotNull(decoded);
            assertTrue(decoded.getColorModel().hasAlpha());
            assertEquals(targetWidth, validated.width());
            assertEquals(targetWidth, validated.height());
            assertTrue(alphaAt(decoded, 0, 0) < 10, "transparent corner should stay transparent");
            assertTrue(alphaAt(decoded, targetWidth / 2, targetWidth / 2) > 200, "opaque center should stay opaque");
            assertEquals(64, variant.checksumSha256().length());
            assertEquals(variant.sizeBytes(), variant.bytes().length);
            assertTrue(variant.sizeBytes() > 0);
            assertWebpContainer(variant.bytes());

            printStats("PNG_ALPHA", original.sizeBytes(), null, variant);
        }
    }

    @Test
    void shouldSkipResponsiveVariantWhenTargetWidthWouldUpscaleSource() throws IOException {
        byte[] smallJpeg = jpegFixture(240, 180);

        assertTrue(service.resizeToWebp(smallJpeg, 320).isEmpty());
        assertTrue(service.resizeToWebp(smallJpeg, 640).isEmpty());
    }

    @Test
    void shouldProduceDistinctChecksumsAndConsistentSizeBytesForResponsiveVariants() throws IOException {
        byte[] jpeg = jpegFixture(1600, 1200);
        ResponsiveImageResizeSpikeService.ResponsiveVariant variant320 = service.resizeToWebp(jpeg, 320).orElseThrow();
        ResponsiveImageResizeSpikeService.ResponsiveVariant variant640 = service.resizeToWebp(jpeg, 640).orElseThrow();

        assertNotEquals(variant320.checksumSha256(), variant640.checksumSha256());
        assertNotEquals(variant320.sizeBytes(), variant640.sizeBytes());
        assertEquals(variant320.sizeBytes(), variant320.bytes().length);
        assertEquals(variant640.sizeBytes(), variant640.bytes().length);
        assertEquals(64, variant320.checksumSha256().length());
        assertEquals(64, variant640.checksumSha256().length());
    }

    private byte[] jpegFixture(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            for (int y = 0; y < image.getHeight(); y++) {
                for (int x = 0; x < image.getWidth(); x++) {
                    int red = (x * 255) / image.getWidth();
                    int green = (y * 255) / image.getHeight();
                    int blue = ((x + y) * 255) / (image.getWidth() + image.getHeight());
                    image.setRGB(x, y, new Color(red, green, blue).getRGB());
                }
            }
            graphics.setColor(Color.WHITE);
            graphics.fillOval(width / 8, height / 8, width / 3, height / 3);
            graphics.setColor(new Color(20, 65, 140));
            graphics.fillRoundRect(width / 2, height / 3, width / 4, height / 5, 24, 24);
            graphics.setColor(new Color(244, 180, 64));
            graphics.fillOval(width / 3, height / 2, width / 4, height / 4);
        } finally {
            graphics.dispose();
        }
        return writeImage(image, "jpg");
    }

    private byte[] transparentPngFixture(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setComposite(AlphaComposite.Clear);
            graphics.fillRect(0, 0, width, height);
            graphics.setComposite(AlphaComposite.SrcOver);
            graphics.setColor(new Color(230, 40, 80, 255));
            graphics.fillRoundRect(width / 5, height / 5, width / 2, height / 2, 48, 48);
            graphics.setColor(new Color(40, 90, 210, 160));
            graphics.fillOval(width / 3, height / 3, width / 3, height / 3);
        } finally {
            graphics.dispose();
        }
        return writeImage(image, "png");
    }

    private byte[] writeImage(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(image, format, output));
        return output.toByteArray();
    }

    private void assertWebpContainer(byte[] bytes) {
        assertTrue(bytes.length >= 12);
        assertEquals('R', bytes[0]);
        assertEquals('I', bytes[1]);
        assertEquals('F', bytes[2]);
        assertEquals('F', bytes[3]);
        assertEquals('W', bytes[8]);
        assertEquals('E', bytes[9]);
        assertEquals('B', bytes[10]);
        assertEquals('P', bytes[11]);
    }

    private int alphaAt(BufferedImage image, int x, int y) {
        return (image.getRGB(x, y) >>> 24) & 0xFF;
    }

    private void printStats(
            String sourceType,
            long originalSizeBytes,
            Long fullSizeWebpBytes,
            ResponsiveImageResizeSpikeService.ResponsiveVariant variant
    ) {
        System.out.printf(
                "RESPONSIVE_WEBP_SPIKE source=%s targetWidth=%d width=%d height=%d originalBytes=%d fullSizeWebpBytes=%s webpBytes=%d elapsedMs=%d memoryDeltaBytes=%d checksum=%s%n",
                sourceType,
                variant.targetWidth(),
                variant.width(),
                variant.height(),
                originalSizeBytes,
                fullSizeWebpBytes == null ? "n/a" : fullSizeWebpBytes,
                variant.sizeBytes(),
                variant.elapsed().toMillis(),
                variant.usedMemoryDeltaBytes(),
                variant.checksumSha256()
        );
    }
}
