package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFileType;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageMetadata;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageProvider;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageRef;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStoreCommand;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceVerificationResult;
import com.erppos.backend.erp.billing.domain.model.StorageStoreResult;
import com.erppos.backend.erp.billing.domain.port.BillingXmlFileRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.FiscalEvidenceStoragePort;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

public class LegacyBillingXmlEvidenceStorageAdapter implements FiscalEvidenceStoragePort {

    private final BillingXmlFileRepositoryPort billingXmlFileRepositoryPort;

    public LegacyBillingXmlEvidenceStorageAdapter(BillingXmlFileRepositoryPort billingXmlFileRepositoryPort) {
        if (billingXmlFileRepositoryPort == null) {
            throw new BillingBusinessRuleException("billingXmlFileRepositoryPort is required");
        }
        this.billingXmlFileRepositoryPort = billingXmlFileRepositoryPort;
    }

    @Override
    public StorageStoreResult store(FiscalEvidenceStoreCommand command) {
        if (command == null) {
            throw new BillingBusinessRuleException("command is required");
        }
        ensureProvider(command.storageProvider());
        ensureSignedXml(command.evidenceType());
        BillingXmlFile signed = signedXml(command.documentId())
                .orElseThrow(() -> new BillingBusinessRuleException("Signed XML legacy evidence was not found"));
        return new StorageStoreResult(metadata(command, signed), true);
    }

    @Override
    public boolean exists(FiscalEvidenceStorageRef ref) {
        ensureRef(ref);
        return signedXml(ref.documentId()).isPresent();
    }

    @Override
    public FiscalEvidenceVerificationResult verifyChecksum(FiscalEvidenceStorageRef ref, String expectedSha256) {
        ensureRef(ref);
        String normalizedExpected = new FiscalEvidenceVerificationResult(ref, expectedSha256, false, true).checksumSha256();
        if (normalizedExpected == null) {
            return new FiscalEvidenceVerificationResult(ref, null, false, true);
        }
        boolean matches = signedXml(ref.documentId())
                .map(BillingXmlFile::content)
                .map(this::sha256)
                .filter(normalizedExpected::equals)
                .isPresent();
        return new FiscalEvidenceVerificationResult(ref, normalizedExpected, matches, true);
    }

    @Override
    public FiscalEvidenceStorageMetadata metadataOnly(FiscalEvidenceStorageRef ref) {
        ensureRef(ref);
        BillingXmlFile signed = signedXml(ref.documentId())
                .orElseThrow(() -> new BillingBusinessRuleException("Signed XML legacy evidence was not found"));
        return new FiscalEvidenceStorageMetadata(
                ref.documentId(),
                ref.attemptId(),
                ref.evidenceType(),
                ref.environment(),
                FiscalEvidenceStorageProvider.DB_LEGACY,
                ref.storageKey(),
                signed.fileName(),
                signed.mimeType(),
                sizeBytes(signed.content()),
                sha256(signed.content()),
                sha256(signed.content()),
                ref.simulated()
        );
    }

    private FiscalEvidenceStorageMetadata metadata(FiscalEvidenceStoreCommand command, BillingXmlFile signed) {
        return new FiscalEvidenceStorageMetadata(
                command.documentId(),
                command.attemptId(),
                command.evidenceType(),
                command.environment(),
                FiscalEvidenceStorageProvider.DB_LEGACY,
                command.storageKey(),
                command.fileName() == null ? signed.fileName() : command.fileName(),
                command.mimeType() == null ? signed.mimeType() : command.mimeType(),
                command.sizeBytes() == null ? sizeBytes(signed.content()) : command.sizeBytes(),
                command.checksumSha256() == null ? sha256(signed.content()) : command.checksumSha256(),
                command.contentHashSha256() == null ? sha256(signed.content()) : command.contentHashSha256(),
                command.simulated()
        );
    }

    private Optional<BillingXmlFile> signedXml(Long documentId) {
        return billingXmlFileRepositoryPort.findByElectronicDocumentIdAndFileType(documentId, BillingXmlFileType.SIGNED);
    }

    private long sizeBytes(String content) {
        return content == null ? 0L : content.getBytes(StandardCharsets.UTF_8).length;
    }

    private String sha256(String content) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest((content == null ? "" : content).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available", ex);
        }
    }

    private void ensureRef(FiscalEvidenceStorageRef ref) {
        if (ref == null) {
            throw new BillingBusinessRuleException("ref is required");
        }
        ensureProvider(ref.storageProvider());
        ensureSignedXml(ref.evidenceType());
    }

    private void ensureProvider(FiscalEvidenceStorageProvider provider) {
        if (provider != FiscalEvidenceStorageProvider.DB_LEGACY) {
            throw new BillingBusinessRuleException("Legacy billing XML evidence storage only supports provider DB_LEGACY");
        }
    }

    private void ensureSignedXml(FiscalEvidenceType evidenceType) {
        if (evidenceType != FiscalEvidenceType.SIGNED_XML) {
            throw new BillingBusinessRuleException("Legacy billing XML evidence storage only supports SIGNED_XML");
        }
    }
}
