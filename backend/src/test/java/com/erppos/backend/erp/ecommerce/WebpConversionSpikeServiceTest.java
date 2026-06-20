package com.erppos.backend.erp.ecommerce;

import com.erppos.backend.erp.ecommerce.application.service.EcommerceImageStorageProperties;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceProductImageBinaryService;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebpConversionSpikeServiceTest {
    private final WebpConversionSpikeService converter = new WebpConversionSpikeService();
    private final EcommerceProductImageBinaryService ecommerceImageValidator = new EcommerceProductImageBinaryService(
            object -> null,
            new EcommerceImageStorageProperties(),
            new PublicImageUrlPolicy(new PublicImageUrlProperties())
    );

    @Test
    void shouldConvertJpegToWebpAndKeepDimensionsReadableByExistingParser() throws IOException {
        byte[] jpeg = jpegFixture();

        WebpConversionSpikeService.ConversionResult webp = converter.convertToWebp(jpeg, 0.82f);
        EcommerceProductImageBinaryService.ValidatedProductImage validated = ecommerceImageValidator.validate(
                webp.bytes(),
                "image/webp",
                "spike-jpeg.webp"
        );

        assertWebpContainer(webp.bytes());
        assertEquals("image/webp", webp.mimeType());
        assertEquals("image/webp", validated.mimeType());
        assertEquals(96, webp.width());
        assertEquals(72, webp.height());
        assertEquals(96, validated.width());
        assertEquals(72, validated.height());
        assertEquals(64, webp.checksumSha256().length());
        assertTrue(webp.sizeBytes() > 0);
        assertTrue(webp.elapsed().toMillis() < 5_000);

        printStats("JPEG", jpeg.length, webp);
    }

    @Test
    void shouldConvertTransparentPngToWebpAndPreserveAlphaChannel() throws IOException {
        byte[] png = transparentPngFixture();

        WebpConversionSpikeService.ConversionResult webp = converter.convertToWebp(png, 0.82f);
        EcommerceProductImageBinaryService.ValidatedProductImage validated = ecommerceImageValidator.validate(
                webp.bytes(),
                "image/webp",
                "spike-transparent.webp"
        );
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(webp.bytes()));

        assertWebpContainer(webp.bytes());
        assertNotNull(decoded);
        assertTrue(decoded.getColorModel().hasAlpha());
        assertEquals("image/webp", validated.mimeType());
        assertEquals(64, validated.width());
        assertEquals(64, validated.height());
        assertTrue(alphaAt(decoded, 0, 0) < 10, "transparent corner should stay transparent");
        assertTrue(alphaAt(decoded, 24, 24) > 240, "opaque square should stay opaque");
        assertEquals(64, webp.checksumSha256().length());
        assertTrue(webp.sizeBytes() > 0);
        assertTrue(webp.elapsed().toMillis() < 5_000);

        printStats("PNG_ALPHA", png.length, webp);
    }

    @Test
    void shouldExposeWebpWriterAndReaderThroughImageIoWithoutSystemPackages() throws IOException {
        ImageIO.scanForPlugins();

        assertTrue(ImageIO.getImageWritersByMIMEType("image/webp").hasNext());
        byte[] webp = converter.convertToWebp(jpegFixture(), 0.82f).bytes();

        assertTrue(ImageIO.getImageReadersByMIMEType("image/webp").hasNext());
        assertNotNull(ImageIO.read(new ByteArrayInputStream(webp)));
    }

    private byte[] jpegFixture() throws IOException {
        BufferedImage image = new BufferedImage(96, 72, BufferedImage.TYPE_INT_RGB);
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
            graphics.fillOval(18, 14, 42, 42);
            graphics.setColor(new Color(20, 65, 140));
            graphics.fillRect(48, 32, 30, 18);
        } finally {
            graphics.dispose();
        }
        return writeImage(image, "jpg");
    }

    private byte[] transparentPngFixture() throws IOException {
        BufferedImage image = new BufferedImage(64, 64, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setComposite(AlphaComposite.Clear);
            graphics.fillRect(0, 0, 64, 64);
            graphics.setComposite(AlphaComposite.SrcOver);
            graphics.setColor(new Color(230, 40, 80, 255));
            graphics.fillRoundRect(12, 12, 34, 34, 10, 10);
            graphics.setColor(new Color(40, 90, 210, 120));
            graphics.fillOval(26, 20, 28, 28);
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
        assertFalse(bytes.length == 12);
    }

    private int alphaAt(BufferedImage image, int x, int y) {
        return (image.getRGB(x, y) >>> 24) & 0xFF;
    }

    private void printStats(String sourceType, int sourceSizeBytes, WebpConversionSpikeService.ConversionResult webp) {
        System.out.printf(
                "WEBP_SPIKE source=%s originalBytes=%d webpBytes=%d smaller=%s elapsedMs=%d memoryDeltaBytes=%d checksum=%s%n",
                sourceType,
                sourceSizeBytes,
                webp.sizeBytes(),
                webp.sizeBytes() < sourceSizeBytes,
                webp.elapsed().toMillis(),
                webp.usedMemoryDeltaBytes(),
                webp.checksumSha256()
        );
    }
}
