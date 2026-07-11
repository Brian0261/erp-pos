package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageMetadata;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageProvider;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageRef;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStoreCommand;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceVerificationResult;
import com.erppos.backend.erp.billing.domain.model.StorageStoreResult;
import com.erppos.backend.erp.billing.domain.port.FiscalEvidenceStoragePort;

public class NoopFiscalEvidenceStorageAdapter implements FiscalEvidenceStoragePort {

    @Override
    public StorageStoreResult store(FiscalEvidenceStoreCommand command) {
        if (command == null) {
            throw new BillingBusinessRuleException("command is required");
        }
        ensureProvider(command.storageProvider());
        return new StorageStoreResult(metadata(command.metadata()), true);
    }

    @Override
    public boolean exists(FiscalEvidenceStorageRef ref) {
        ensureRef(ref);
        return true;
    }

    @Override
    public FiscalEvidenceVerificationResult verifyChecksum(FiscalEvidenceStorageRef ref, String expectedSha256) {
        ensureRef(ref);
        return new FiscalEvidenceVerificationResult(ref, expectedSha256, expectedSha256 == null, true);
    }

    @Override
    public FiscalEvidenceStorageMetadata metadataOnly(FiscalEvidenceStorageRef ref) {
        ensureRef(ref);
        return new FiscalEvidenceStorageMetadata(
                ref.documentId(),
                ref.attemptId(),
                ref.evidenceType(),
                ref.environment(),
                FiscalEvidenceStorageProvider.NONE,
                ref.storageKey(),
                null,
                null,
                0L,
                null,
                null,
                true
        );
    }

    private FiscalEvidenceStorageMetadata metadata(FiscalEvidenceStorageMetadata metadata) {
        return new FiscalEvidenceStorageMetadata(
                metadata.documentId(),
                metadata.attemptId(),
                metadata.evidenceType(),
                metadata.environment(),
                FiscalEvidenceStorageProvider.NONE,
                metadata.storageKey(),
                metadata.fileName(),
                metadata.mimeType(),
                metadata.sizeBytes(),
                metadata.checksumSha256(),
                metadata.contentHashSha256(),
                true
        );
    }

    private void ensureRef(FiscalEvidenceStorageRef ref) {
        if (ref == null) {
            throw new BillingBusinessRuleException("ref is required");
        }
        ensureProvider(ref.storageProvider());
    }

    private void ensureProvider(FiscalEvidenceStorageProvider provider) {
        if (provider != null && provider != FiscalEvidenceStorageProvider.NONE) {
            throw new BillingBusinessRuleException("Noop fiscal evidence storage only supports provider NONE");
        }
    }
}
