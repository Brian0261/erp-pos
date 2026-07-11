package com.erppos.backend.erp.billing.domain.model;

public record FiscalEvidenceStoreCommand(
        Long documentId,
        Long attemptId,
        FiscalEvidenceType evidenceType,
        BillingEnvironment environment,
        FiscalEvidenceStorageProvider storageProvider,
        String storageKey,
        String fileName,
        String mimeType,
        Long sizeBytes,
        String checksumSha256,
        String contentHashSha256,
        boolean simulated
) {
    public FiscalEvidenceStoreCommand {
        FiscalEvidenceStorageMetadata metadata = new FiscalEvidenceStorageMetadata(
                documentId,
                attemptId,
                evidenceType,
                environment,
                storageProvider,
                storageKey,
                fileName,
                mimeType,
                sizeBytes,
                checksumSha256,
                contentHashSha256,
                simulated
        );
        documentId = metadata.documentId();
        attemptId = metadata.attemptId();
        evidenceType = metadata.evidenceType();
        environment = metadata.environment();
        storageProvider = metadata.storageProvider();
        storageKey = metadata.storageKey();
        fileName = metadata.fileName();
        mimeType = metadata.mimeType();
        sizeBytes = metadata.sizeBytes();
        checksumSha256 = metadata.checksumSha256();
        contentHashSha256 = metadata.contentHashSha256();
    }

    public FiscalEvidenceStorageMetadata metadata() {
        return new FiscalEvidenceStorageMetadata(
                documentId,
                attemptId,
                evidenceType,
                environment,
                storageProvider,
                storageKey,
                fileName,
                mimeType,
                sizeBytes,
                checksumSha256,
                contentHashSha256,
                simulated
        );
    }
}
