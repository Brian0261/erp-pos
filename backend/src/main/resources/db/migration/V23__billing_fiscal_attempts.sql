CREATE TABLE IF NOT EXISTS electronic_document_attempts (
    id BIGSERIAL PRIMARY KEY,
    electronic_document_id BIGINT NOT NULL,
    operation VARCHAR(30) NOT NULL,
    attempt_number INT NOT NULL,
    result VARCHAR(30) NOT NULL,
    error_category VARCHAR(40),
    recoverable BOOLEAN NOT NULL DEFAULT FALSE,
    provider_status VARCHAR(30),
    provider_code VARCHAR(80),
    provider_message VARCHAR(400),
    provider_ticket VARCHAR(120),
    provider_correlation_id VARCHAR(120),
    request_hash VARCHAR(64),
    response_hash VARCHAR(64),
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    actor VARCHAR(120) NOT NULL,
    trace_id VARCHAR(80),
    simulated BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_electronic_document_attempts_doc FOREIGN KEY (electronic_document_id) REFERENCES electronic_documents (id) ON DELETE CASCADE,
    CONSTRAINT chk_electronic_document_attempts_number CHECK (attempt_number >= 1),
    CONSTRAINT chk_electronic_document_attempts_operation CHECK (operation IN ('GENERATE_XML','SIGN_XML','SEND')),
    CONSTRAINT chk_electronic_document_attempts_result CHECK (result IN ('STARTED','SUCCESS','FAILED','BLOCKED','PENDING','SKIPPED_IDEMPOTENT'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_document_attempts_doc_op_num
    ON electronic_document_attempts (electronic_document_id, operation, attempt_number);

CREATE INDEX IF NOT EXISTS idx_electronic_document_attempts_doc_op_num
    ON electronic_document_attempts (electronic_document_id, operation, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_electronic_document_attempts_operation_result
    ON electronic_document_attempts (operation, result);

CREATE INDEX IF NOT EXISTS idx_electronic_document_attempts_error_category
    ON electronic_document_attempts (error_category);
