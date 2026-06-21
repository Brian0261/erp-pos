package com.erppos.backend.erp.ecommerce;

import com.erppos.backend.erp.ecommerce.application.service.EcommerceImageStorageProperties;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceProductImageBinaryService;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceResponsiveWebpVariantGenerationService;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EcommerceResponsiveWebpVariantGenerationServiceTest {
    private final EcommerceProductImageBinaryService imageBinaryService = new EcommerceProductImageBinaryService(
            object -> null,
            new EcommerceImageStorageProperties(),
            new PublicImageUrlPolicy(new PublicImageUrlProperties())
    );
    private final EcommerceResponsiveWebpVariantGenerationService service = new EcommerceResponsiveWebpVariantGenerationService(imageBinaryService);

    @Test
    void shouldGenerateResponsiveWebpTargetsFromJpegWithoutUpscaling() throws IOException {
        byte[] jpeg = jpegGradientBytes(1600, 1200);
        EcommerceProductImageBinaryService.ValidatedProductImage original = imageBinaryService.validate(jpeg, "image/jpeg", "product.jpg");

        List<EcommerceResponsiveWebpVariantGenerationService.GeneratedResponsiveWebpVariant> variants = service.generateResponsiveVariants(jpeg, original);

        assertEquals(List.of(320, 640, 960, 1280), variants.stream().map(EcommerceResponsiveWebpVariantGenerationService.GeneratedResponsiveWebpVariant::targetWidth).toList());
        for (int i = 0; i < variants.size(); i++) {
            EcommerceResponsiveWebpVariantGenerationService.GeneratedResponsiveWebpVariant variant = variants.get(i);
            EcommerceProductImageBinaryService.ValidatedProductImage validatedVariant = imageBinaryService.validate(
                    variant.bytes(), "image/webp", "product-" + variant.targetWidth() + "w.webp");

            assertEquals("image/webp", variant.mimeType());
            assertEquals(variant.targetWidth(), variant.width());
            assertEquals(Math.round((float) original.height() * variant.targetWidth() / original.width()), variant.height());
            assertEquals(original.checksumSha256(), variant.sourceChecksumSha256());
            assertEquals(validatedVariant.checksumSha256(), variant.checksumSha256());
            assertEquals(variant.bytes().length, variant.sizeBytes());
            assertEquals(i, variant.sortOrder());
        }
    }

    @Test
    void shouldGenerateTransparentPngResponsiveWebpAndPreserveAlpha() throws IOException {
        byte[] png = transparentPngBytes(800, 800);
        EcommerceProductImageBinaryService.ValidatedProductImage original = imageBinaryService.validate(png, "image/png", "transparent.png");

        List<EcommerceResponsiveWebpVariantGenerationService.GeneratedResponsiveWebpVariant> variants = service.generateResponsiveVariants(png, original);

        assertEquals(List.of(320, 640), variants.stream().map(EcommerceResponsiveWebpVariantGenerationService.GeneratedResponsiveWebpVariant::targetWidth).toList());
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(variants.get(0).bytes()));
        assertNotNull(decoded);
        assertTrue(decoded.getColorModel().hasAlpha());
        assertTrue(alphaAt(decoded, 0, 0) < 10);
        assertTrue(alphaAt(decoded, decoded.getWidth() / 2, decoded.getHeight() / 2) > 80);
    }

    @Test
    void shouldSkipResponsiveVariantsWhenTargetsWouldUpscaleSource() throws IOException {
        byte[] jpeg = jpegGradientBytes(240, 180);
        EcommerceProductImageBinaryService.ValidatedProductImage original = imageBinaryService.validate(jpeg, "image/jpeg", "small.jpg");

        assertTrue(service.generateResponsiveVariants(jpeg, original).isEmpty());
    }

    @Test
    void shouldNotGenerateResponsiveVariantsForWebpOriginal() {
        byte[] webp = webpVp8Bytes(2, 3);
        EcommerceProductImageBinaryService.ValidatedProductImage original = imageBinaryService.validate(webp, "image/webp", "product.webp");

        assertFalse(service.generateResponsiveVariants(webp, original).iterator().hasNext());
    }

    private byte[] jpegGradientBytes(int width, int height) throws IOException {
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
            graphics.fillRect(width / 2, height / 3, width / 4, height / 5);
        } finally {
            graphics.dispose();
        }
        return writeImage(image, "jpg");
    }

    private byte[] transparentPngBytes(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setComposite(AlphaComposite.Clear);
            graphics.fillRect(0, 0, width, height);
            graphics.setComposite(AlphaComposite.SrcOver);
            graphics.setColor(new Color(230, 40, 80, 255));
            graphics.fillRoundRect(width / 6, height / 6, width / 2, height / 2, 10, 10);
            graphics.setColor(new Color(40, 90, 210, 120));
            graphics.fillOval(width / 3, width / 3, width / 3, height / 3);
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

    private int alphaAt(BufferedImage image, int x, int y) {
        return (image.getRGB(x, y) >>> 24) & 0xFF;
    }

    private byte[] webpVp8Bytes(int width, int height) {
        byte[] data = new byte[10];
        data[3] = (byte) 0x9D;
        data[4] = 0x01;
        data[5] = 0x2A;
        writeShortLittleEndian(data, 6, width);
        writeShortLittleEndian(data, 8, height);
        return riffWebpChunk("VP8 ", data);
    }

    private byte[] riffWebpChunk(String fourCc, byte[] data) {
        int paddedChunkSize = 8 + data.length + (data.length % 2);
        byte[] bytes = new byte[12 + paddedChunkSize];
        bytes[0] = 'R';
        bytes[1] = 'I';
        bytes[2] = 'F';
        bytes[3] = 'F';
        writeIntLittleEndian(bytes, 4, bytes.length - 8);
        bytes[8] = 'W';
        bytes[9] = 'E';
        bytes[10] = 'B';
        bytes[11] = 'P';
        for (int i = 0; i < 4; i++) {
            bytes[12 + i] = (byte) fourCc.charAt(i);
        }
        writeIntLittleEndian(bytes, 16, data.length);
        System.arraycopy(data, 0, bytes, 20, data.length);
        return bytes;
    }

    private void writeShortLittleEndian(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) (value & 0xFF);
        bytes[offset + 1] = (byte) ((value >> 8) & 0xFF);
    }

    private void writeIntLittleEndian(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) (value & 0xFF);
        bytes[offset + 1] = (byte) ((value >> 8) & 0xFF);
        bytes[offset + 2] = (byte) ((value >> 16) & 0xFF);
        bytes[offset + 3] = (byte) ((value >> 24) & 0xFF);
    }
}
