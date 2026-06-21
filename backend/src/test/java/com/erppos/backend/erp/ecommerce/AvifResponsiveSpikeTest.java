package com.erppos.backend.erp.ecommerce;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;

import static org.junit.jupiter.api.Assertions.assertFalse;

class AvifResponsiveSpikeTest {
    @Test
    void shouldDocumentAvifBlockedWhenNoSafeImageIoSupportIsPresent() {
        ImageIO.scanForPlugins();

        boolean hasAvifWriter = ImageIO.getImageWritersByMIMEType("image/avif").hasNext();
        boolean hasAvifReader = ImageIO.getImageReadersByMIMEType("image/avif").hasNext();

        System.out.printf(
                "AVIF_SPIKE status=BLOCKED reason=no-imageio-avif-support writer=%s reader=%s dockerfileRequired=%s runtimeDependencyAdded=%s%n",
                hasAvifWriter,
                hasAvifReader,
                true,
                false
        );

        assertFalse(hasAvifWriter, "AVIF writer unexpectedly exists; update the spike conclusion before enabling AVIF");
        assertFalse(hasAvifReader, "AVIF reader unexpectedly exists; update the spike conclusion before enabling AVIF");
    }
}
