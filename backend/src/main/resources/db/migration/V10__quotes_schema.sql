CREATE TABLE IF NOT EXISTS quotes (
    id BIGSERIAL PRIMARY KEY,
    quote_number VARCHAR(40) NOT NULL,
    customer_name VARCHAR(180) NOT NULL,
    customer_document VARCHAR(40),
    customer_phone VARCHAR(40),
    customer_email VARCHAR(160),
    status VARCHAR(20) NOT NULL,
    issue_date DATE NOT NULL,
    expires_at DATE NOT NULL,
    sent_at TIMESTAMPTZ,
    converted_sale_id BIGINT,
    subtotal_amount NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    notes VARCHAR(400),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120) NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    CONSTRAINT fk_quotes_converted_sale FOREIGN KEY (converted_sale_id) REFERENCES sales (id),
    CONSTRAINT chk_quotes_status CHECK (status IN ('DRAFT','SENT','EXPIRED','CONVERTED','CANCELLED')),
    CONSTRAINT chk_quotes_amounts_non_negative CHECK (
        subtotal_amount >= 0 AND discount_amount >= 0 AND total_amount >= 0
    )
);

CREATE TABLE IF NOT EXISTS quote_items (
    id BIGSERIAL PRIMARY KEY,
    quote_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity NUMERIC(16,3) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL,
    line_total NUMERIC(14,2) NOT NULL,
    CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE CASCADE,
    CONSTRAINT fk_quote_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT chk_quote_items_values CHECK (
        quantity > 0 AND unit_price >= 0 AND discount_amount >= 0 AND line_total >= 0
    )
);

CREATE TABLE IF NOT EXISTS quote_status_history (
    id BIGSERIAL PRIMARY KEY,
    quote_id BIGINT NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    comment VARCHAR(400),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by VARCHAR(120) NOT NULL,
    CONSTRAINT fk_quote_status_history_quote FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE CASCADE,
    CONSTRAINT chk_quote_status_history_prev CHECK (
        previous_status IS NULL OR previous_status IN ('DRAFT','SENT','EXPIRED','CONVERTED','CANCELLED')
    ),
    CONSTRAINT chk_quote_status_history_new CHECK (
        new_status IN ('DRAFT','SENT','EXPIRED','CONVERTED','CANCELLED')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_quote_number ON quotes (quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_issue_date ON quotes (issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_name ON quotes (LOWER(customer_name));
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote_id ON quote_status_history (quote_id);

