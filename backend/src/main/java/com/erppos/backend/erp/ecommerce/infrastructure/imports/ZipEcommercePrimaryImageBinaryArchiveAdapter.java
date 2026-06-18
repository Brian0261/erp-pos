package com.erppos.backend.erp.ecommerce.infrastructure.imports;

import com.erppos.backend.erp.ecommerce.application.port.EcommercePrimaryImageBinaryArchivePort;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommercePrimaryImageBinaryImportUseCase;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class ZipEcommercePrimaryImageBinaryArchiveAdapter implements EcommercePrimaryImageBinaryArchivePort {
    private static final int MAX_ENTRIES = 500;
    private static final long MAX_ENTRY_BYTES = 5L * 1024L * 1024L;
    private static final long MAX_TOTAL_UNCOMPRESSED_BYTES = 80L * 1024L * 1024L;

    @Override
    public Map<String, EcommercePrimaryImageBinaryImportUseCase.ArchiveImage> parse(String originalFilename, byte[] content) {
        validateArchiveFile(originalFilename, content);
        Map<String, EcommercePrimaryImageBinaryImportUseCase.ArchiveImage> images = new LinkedHashMap<>();
        int entryCount = 0;
        long totalBytes = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(content))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    continue;
                }
                entryCount += 1;
                if (entryCount > MAX_ENTRIES) {
                    throw badRequest("ZIP has too many files");
                }
                String normalizedPath = normalizeEntryPath(entry.getName());
                byte[] bytes = readEntry(zip);
                totalBytes += bytes.length;
                if (totalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
                    throw badRequest("ZIP uncompressed content is too large");
                }
                String key = normalizedPath.toLowerCase(Locale.ROOT);
                if (images.containsKey(key)) {
                    throw badRequest("ZIP contains duplicated image entries");
                }
                images.put(key, new EcommercePrimaryImageBinaryImportUseCase.ArchiveImage(normalizedPath, entry.getName(), bytes));
            }
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (IOException ex) {
            throw badRequest("Invalid .zip file");
        }
        if (images.isEmpty()) {
            throw badRequest("ZIP file does not contain image files");
        }
        return images;
    }

    private void validateArchiveFile(String originalFilename, byte[] content) {
        if (content == null || content.length == 0) {
            throw badRequest("archive is required");
        }
        String filename = originalFilename == null ? "" : originalFilename.trim().toLowerCase(Locale.ROOT);
        if (!filename.endsWith(".zip")) {
            throw badRequest("Only .zip archives are supported");
        }
    }

    private byte[] readEntry(ZipInputStream zip) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        long entryBytes = 0;
        while ((read = zip.read(buffer)) >= 0) {
            entryBytes += read;
            if (entryBytes > MAX_ENTRY_BYTES) {
                throw badRequest("ZIP entry is too large");
            }
            output.write(buffer, 0, read);
        }
        if (entryBytes == 0) {
            throw badRequest("ZIP entry is empty");
        }
        return output.toByteArray();
    }

    private String normalizeEntryPath(String rawPath) {
        String path = rawPath == null ? "" : rawPath.trim();
        if (path.isBlank()) {
            throw badRequest("ZIP entry path is empty");
        }
        if (path.contains("\\")) {
            throw badRequest("ZIP entry path is unsafe");
        }
        if (path.startsWith("/") || path.matches("^[A-Za-z]:.*")) {
            throw badRequest("ZIP entry path is unsafe");
        }
        String[] segments = path.split("/");
        for (String segment : segments) {
            if (segment.isBlank() || ".".equals(segment) || "..".equals(segment)) {
                throw badRequest("ZIP entry path is unsafe");
            }
        }
        return String.join("/", segments);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
