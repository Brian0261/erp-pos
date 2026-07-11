package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceFilesystemStoreCommand;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageMetadata;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageProvider;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageRef;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStoreCommand;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceVerificationResult;
import com.erppos.backend.erp.billing.domain.model.StorageStoreResult;
import com.erppos.backend.erp.billing.domain.port.FiscalEvidenceStoragePort;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public class FilesystemFiscalEvidenceStorageAdapter implements FiscalEvidenceStoragePort {

    private final FilesystemStorageSettings settings;

    public FilesystemFiscalEvidenceStorageAdapter() {
        this(FilesystemStorageSettings.disabled());
    }

    public FilesystemFiscalEvidenceStorageAdapter(FilesystemStorageSettings settings) {
        this.settings = settings == null ? FilesystemStorageSettings.disabled() : settings;
    }

    public StorageStoreResult storeSyntheticContent(FiscalEvidenceFilesystemStoreCommand command) {
        if (command == null) {
            throw new BillingBusinessRuleException("command is required");
        }
        FiscalEvidenceStoreCommand metadataCommand = command.metadataCommand();
        FiscalEvidenceStorageMetadata metadata = metadataCommand.metadata();
        ensureSupported(metadata.ref());
        Path destination = resolveStoragePath(metadata.storageKey());

        Path temp = null;
        try {
            prepareParent(destination.getParent());
            if (Files.exists(destination, LinkOption.NOFOLLOW_LINKS)) {
                return handleExisting(command, destination);
            }
            temp = Files.createTempFile(destination.getParent(), ".fiscal-evidence-", ".tmp");
            byte[] content = command.content();
            Files.write(temp, content);
            VerifiedFile verified = verifyTempFile(temp, command.contentLength(), command.expectedSha256());
            movePutIfAbsent(temp, destination);
            temp = null;
            return new StorageStoreResult(metadataWithStoredValues(metadata, verified), true);
        } catch (IOException ex) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence could not be stored safely");
        } finally {
            deleteQuietly(temp);
        }
    }

    @Override
    public StorageStoreResult store(FiscalEvidenceStoreCommand command) {
        throw new BillingBusinessRuleException("Filesystem fiscal evidence storage requires synthetic content command");
    }

    @Override
    public boolean exists(FiscalEvidenceStorageRef ref) {
        ensureSupported(ref);
        return Files.exists(resolveStoragePath(ref.storageKey()), LinkOption.NOFOLLOW_LINKS);
    }

    @Override
    public FiscalEvidenceVerificationResult verifyChecksum(FiscalEvidenceStorageRef ref, String expectedSha256) {
        ensureSupported(ref);
        String normalizedExpected = new FiscalEvidenceVerificationResult(ref, expectedSha256, false, true).checksumSha256();
        if (normalizedExpected == null) {
            return new FiscalEvidenceVerificationResult(ref, null, false, true);
        }
        Path path = resolveStoragePath(ref.storageKey());
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS) || Files.isSymbolicLink(path)) {
            return new FiscalEvidenceVerificationResult(ref, normalizedExpected, false, true);
        }
        try {
            return new FiscalEvidenceVerificationResult(ref, normalizedExpected, checksum(path).equals(normalizedExpected), true);
        } catch (IOException ex) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence checksum could not be verified");
        }
    }

    @Override
    public FiscalEvidenceStorageMetadata metadataOnly(FiscalEvidenceStorageRef ref) {
        ensureSupported(ref);
        Path path = resolveStoragePath(ref.storageKey());
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS) || Files.isSymbolicLink(path)) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence was not found");
        }
        try {
            String checksum = checksum(path);
            return new FiscalEvidenceStorageMetadata(
                    ref.documentId(),
                    ref.attemptId(),
                    ref.evidenceType(),
                    ref.environment(),
                    FiscalEvidenceStorageProvider.FILESYSTEM,
                    ref.storageKey(),
                    null,
                    null,
                    Files.size(path),
                    checksum,
                    checksum,
                    true
            );
        } catch (IOException ex) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence metadata could not be loaded");
        }
    }

    private StorageStoreResult handleExisting(FiscalEvidenceFilesystemStoreCommand command, Path destination) {
        if (Files.isSymbolicLink(destination)) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence path is unsafe");
        }
        try {
            String currentChecksum = checksum(destination);
            long currentSize = Files.size(destination);
            if (currentChecksum.equals(command.expectedSha256()) && currentSize == command.contentLength()) {
                return new StorageStoreResult(metadataWithStoredValues(command.metadata(), new VerifiedFile(currentSize, currentChecksum)), true);
            }
        } catch (IOException ex) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence existing object could not be verified");
        }
        throw new BillingConflictException("Filesystem fiscal evidence already exists with different content.");
    }

    private FiscalEvidenceStorageMetadata metadataWithStoredValues(FiscalEvidenceStorageMetadata metadata, VerifiedFile verified) {
        return new FiscalEvidenceStorageMetadata(
                metadata.documentId(),
                metadata.attemptId(),
                metadata.evidenceType(),
                metadata.environment(),
                FiscalEvidenceStorageProvider.FILESYSTEM,
                metadata.storageKey(),
                metadata.fileName(),
                metadata.mimeType(),
                verified.sizeBytes(),
                verified.checksumSha256(),
                verified.checksumSha256(),
                true
        );
    }

    private VerifiedFile verifyTempFile(Path temp, Long expectedSize, String expectedSha256) throws IOException {
        long size = Files.size(temp);
        String checksum = checksum(temp);
        if (size != expectedSize) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence size mismatch");
        }
        if (!checksum.equals(expectedSha256)) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence checksum mismatch");
        }
        return new VerifiedFile(size, checksum);
    }

    private void movePutIfAbsent(Path temp, Path destination) throws IOException {
        try {
            Files.move(temp, destination, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException ex) {
            Files.move(temp, destination);
        }
    }

    private void prepareParent(Path parent) throws IOException {
        if (parent == null) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence parent path is required");
        }
        ensureNoUnsafeSymlink(parent);
        Files.createDirectories(parent);
        ensureNoUnsafeSymlink(parent);
    }

    private void ensureNoUnsafeSymlink(Path path) throws IOException {
        Path base = baseDir();
        Path current = base;
        Path relative = base.relativize(path.toAbsolutePath().normalize());
        for (Path segment : relative) {
            current = current.resolve(segment);
            if (Files.exists(current, LinkOption.NOFOLLOW_LINKS) && Files.isSymbolicLink(current)) {
                throw new BillingBusinessRuleException("Filesystem fiscal evidence path is unsafe");
            }
        }
    }

    private Path resolveStoragePath(String storageKey) {
        if (storageKey == null) {
            throw new BillingBusinessRuleException("storageKey is required");
        }
        Path relative = Path.of(storageKey);
        if (relative.isAbsolute()) {
            throw new BillingBusinessRuleException("storageKey must be relative");
        }
        Path base = baseDir();
        Path resolved = base.resolve(relative).normalize();
        if (!resolved.startsWith(base)) {
            throw new BillingBusinessRuleException("storageKey resolves outside base directory");
        }
        return resolved;
    }

    private void ensureSupported(FiscalEvidenceStorageRef ref) {
        if (ref == null) {
            throw new BillingBusinessRuleException("ref is required");
        }
        if (!settings.enabled()) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence storage is disabled");
        }
        if (settings.baseDir() == null) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence base directory is required");
        }
        if (ref.storageProvider() != FiscalEvidenceStorageProvider.FILESYSTEM) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence storage only supports provider FILESYSTEM");
        }
        if (ref.environment() == BillingEnvironment.PROD) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence storage is not allowed in PROD");
        }
        if (ref.environment() != BillingEnvironment.LOCAL && ref.environment() != BillingEnvironment.BETA) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence storage only supports LOCAL/BETA");
        }
        baseDir();
    }

    private Path baseDir() {
        if (settings.baseDir() == null) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence base directory is required");
        }
        Path base = settings.baseDir().toAbsolutePath().normalize();
        if (!Files.exists(base, LinkOption.NOFOLLOW_LINKS) || !Files.isDirectory(base, LinkOption.NOFOLLOW_LINKS) || Files.isSymbolicLink(base)) {
            throw new BillingBusinessRuleException("Filesystem fiscal evidence base directory is not available");
        }
        return base;
    }

    private String checksum(Path path) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream input = Files.newInputStream(path); DigestInputStream digestInput = new DigestInputStream(input, digest)) {
                digestInput.transferTo(java.io.OutputStream.nullOutputStream());
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available", ex);
        }
    }

    private void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }

    private record VerifiedFile(long sizeBytes, String checksumSha256) {
    }

    public record FilesystemStorageSettings(boolean enabled, Path baseDir) {
        public static FilesystemStorageSettings disabled() {
            return new FilesystemStorageSettings(false, null);
        }
    }
}
