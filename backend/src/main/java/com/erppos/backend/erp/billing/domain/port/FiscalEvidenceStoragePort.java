package com.erppos.backend.erp.billing.domain.port;

import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageMetadata;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageRef;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStoreCommand;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceVerificationResult;
import com.erppos.backend.erp.billing.domain.model.StorageStoreResult;

public interface FiscalEvidenceStoragePort {
    StorageStoreResult store(FiscalEvidenceStoreCommand command);
    boolean exists(FiscalEvidenceStorageRef ref);
    FiscalEvidenceVerificationResult verifyChecksum(FiscalEvidenceStorageRef ref, String expectedSha256);
    FiscalEvidenceStorageMetadata metadataOnly(FiscalEvidenceStorageRef ref);
}
