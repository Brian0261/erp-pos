CREATE TABLE IF NOT EXISTS company_billing_profile (
    id BIGSERIAL PRIMARY KEY,
    ruc VARCHAR(11) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    fiscal_address VARCHAR(300) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    certificate_path VARCHAR(300),
    certificate_password VARCHAR(200),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120) NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    CONSTRAINT chk_company_billing_profile_environment CHECK (environment IN ('LOCAL','BETA','PROD')),
    CONSTRAINT chk_company_billing_profile_ruc CHECK (ruc ~ '^[0-9]{11}$')
);

CREATE TABLE IF NOT EXISTS billing_series (
    id BIGSERIAL PRIMARY KEY,
    document_type VARCHAR(20) NOT NULL,
    series VARCHAR(10) NOT NULL,
    current_number BIGINT NOT NULL,
    environment VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120) NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    CONSTRAINT chk_billing_series_document_type CHECK (document_type IN ('INVOICE','RECEIPT')),
    CONSTRAINT chk_billing_series_environment CHECK (environment IN ('LOCAL','BETA','PROD')),
    CONSTRAINT chk_billing_series_current_number CHECK (current_number >= 1)
);

CREATE TABLE IF NOT EXISTS electronic_documents (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL,
    billing_series_id BIGINT NOT NULL,
    document_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    series VARCHAR(10) NOT NULL,
    number BIGINT NOT NULL,
    full_number VARCHAR(30) NOT NULL,
    customer_name VARCHAR(180),
    customer_document VARCHAR(40),
    currency_code VARCHAR(10) NOT NULL DEFAULT 'PEN',
    subtotal_amount NUMERIC(14,2) NOT NULL,
    tax_amount NUMERIC(14,2) NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    xml_generated_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    provider_ticket VARCHAR(120),
    provider_message VARCHAR(400),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120) NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    CONSTRAINT fk_electronic_documents_series FOREIGN KEY (billing_series_id) REFERENCES billing_series (id),
    CONSTRAINT fk_electronic_documents_sale FOREIGN KEY (sale_id) REFERENCES sales (id),
    CONSTRAINT chk_electronic_documents_document_type CHECK (document_type IN ('INVOICE','RECEIPT')),
    CONSTRAINT chk_electronic_documents_status CHECK (status IN ('DRAFT','GENERATED','SIGNED','SENT','ACCEPTED','REJECTED','ERROR','CANCELLED')),
    CONSTRAINT chk_electronic_documents_environment CHECK (environment IN ('LOCAL','BETA','PROD')),
    CONSTRAINT chk_electronic_documents_amounts CHECK (
        subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount > 0
    )
);

CREATE TABLE IF NOT EXISTS electronic_document_items (
    id BIGSERIAL PRIMARY KEY,
    electronic_document_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    description VARCHAR(220) NOT NULL,
    quantity NUMERIC(16,3) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL,
    line_total NUMERIC(14,2) NOT NULL,
    CONSTRAINT fk_electronic_document_items_doc FOREIGN KEY (electronic_document_id) REFERENCES electronic_documents (id) ON DELETE CASCADE,
    CONSTRAINT fk_electronic_document_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT chk_electronic_document_items_values CHECK (
        quantity > 0 AND unit_price >= 0 AND discount_amount >= 0 AND line_total >= 0
    )
);

CREATE TABLE IF NOT EXISTS electronic_document_status_history (
    id BIGSERIAL PRIMARY KEY,
    electronic_document_id BIGINT NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    message VARCHAR(400),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by VARCHAR(120) NOT NULL,
    CONSTRAINT fk_electronic_document_status_history_doc FOREIGN KEY (electronic_document_id) REFERENCES electronic_documents (id) ON DELETE CASCADE,
    CONSTRAINT chk_electronic_document_status_history_prev CHECK (
        previous_status IS NULL OR previous_status IN ('DRAFT','GENERATED','SIGNED','SENT','ACCEPTED','REJECTED','ERROR','CANCELLED')
    ),
    CONSTRAINT chk_electronic_document_status_history_new CHECK (
        new_status IN ('DRAFT','GENERATED','SIGNED','SENT','ACCEPTED','REJECTED','ERROR','CANCELLED')
    )
);

CREATE TABLE IF NOT EXISTS billing_xml_files (
    id BIGSERIAL PRIMARY KEY,
    electronic_document_id BIGINT NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    mime_type VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120) NOT NULL,
    CONSTRAINT fk_billing_xml_files_doc FOREIGN KEY (electronic_document_id) REFERENCES electronic_documents (id) ON DELETE CASCADE,
    CONSTRAINT chk_billing_xml_files_type CHECK (file_type IN ('GENERATED','SIGNED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_billing_profile_env_active
    ON company_billing_profile (environment)
    WHERE active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_series_doc_type_series_environment
    ON billing_series (document_type, series, environment);

CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_documents_full_number
    ON electronic_documents (full_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_documents_sale_type_active
    ON electronic_documents (sale_id, document_type)
    WHERE status <> 'CANCELLED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_xml_files_doc_type
    ON billing_xml_files (electronic_document_id, file_type);

CREATE INDEX IF NOT EXISTS idx_electronic_documents_sale_id ON electronic_documents (sale_id);
CREATE INDEX IF NOT EXISTS idx_electronic_documents_status ON electronic_documents (status);
CREATE INDEX IF NOT EXISTS idx_electronic_documents_created_at ON electronic_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_electronic_document_status_history_doc ON electronic_document_status_history (electronic_document_id);

