CREATE TABLE IF NOT EXISTS electronic_document_evidence (
    id BIGSERIAL PRIMARY KEY,
    electronic_document_id BIGINT NOT NULL,
    attempt_id BIGINT,
    evidence_type VARCHAR(40) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    simulated BOOLEAN NOT NULL DEFAULT TRUE,
    storage_provider VARCHAR(30) NOT NULL DEFAULT 'NONE',
    storage_key VARCHAR(300),
    file_name VARCHAR(200),
    mime_type VARCHAR(80),
    size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    content_hash_sha256 VARCHAR(64),
    provider_ticket VARCHAR(120),
    provider_correlation_id VARCHAR(120),
    provider_status VARCHAR(40),
    metadata_status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120) NOT NULL,
    trace_id VARCHAR(80),
    notes VARCHAR(400),
    CONSTRAINT fk_electronic_document_evidence_doc FOREIGN KEY (electronic_document_id) REFERENCES electronic_documents (id) ON DELETE CASCADE,
    CONSTRAINT fk_electronic_document_evidence_attempt FOREIGN KEY (attempt_id) REFERENCES electronic_document_attempts (id) ON DELETE SET NULL,
    CONSTRAINT chk_electronic_document_evidence_type CHECK (evidence_type IN ('SIGNED_XML','CDR','PDF','TICKET','QR','PROVIDER_RESPONSE_METADATA')),
    CONSTRAINT chk_electronic_document_evidence_environment CHECK (environment IN ('LOCAL','BETA','PROD')),
    CONSTRAINT chk_electronic_document_evidence_storage_provider CHECK (storage_provider IN ('NONE','DB_LEGACY','FILESYSTEM','S3','GCS')),
    CONSTRAINT chk_electronic_document_evidence_status CHECK (metadata_status IN ('REGISTERED','AVAILABLE','MISSING','REVOKED')),
    CONSTRAINT chk_electronic_document_evidence_size CHECK (size_bytes IS NULL OR size_bytes >= 0),
    CONSTRAINT chk_electronic_document_evidence_checksum CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT chk_electronic_document_evidence_content_hash CHECK (content_hash_sha256 IS NULL OR content_hash_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_electronic_document_evidence_doc_type
    ON electronic_document_evidence (electronic_document_id, evidence_type);

CREATE INDEX IF NOT EXISTS idx_electronic_document_evidence_attempt
    ON electronic_document_evidence (attempt_id);

CREATE INDEX IF NOT EXISTS idx_electronic_document_evidence_created_at
    ON electronic_document_evidence (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_document_evidence_attempt_type_checksum
    ON electronic_document_evidence (attempt_id, evidence_type, checksum_sha256)
    WHERE attempt_id IS NOT NULL AND checksum_sha256 IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_document_evidence_signed_xml_active
    ON electronic_document_evidence (electronic_document_id, evidence_type)
    WHERE evidence_type = 'SIGNED_XML' AND metadata_status <> 'REVOKED';
