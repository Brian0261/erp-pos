CREATE TABLE IF NOT EXISTS cash_register_sessions (
    id BIGSERIAL PRIMARY KEY,
    opened_by_user_id UUID NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    opening_amount NUMERIC(14,2) NOT NULL,
    counted_amount NUMERIC(14,2),
    expected_cash_amount NUMERIC(14,2),
    difference_amount NUMERIC(14,2),
    status VARCHAR(20) NOT NULL,
    notes VARCHAR(400),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cash_register_sessions_user FOREIGN KEY (opened_by_user_id) REFERENCES users (id),
    CONSTRAINT chk_cash_register_status CHECK (status IN ('OPEN','CLOSED')),
    CONSTRAINT chk_cash_register_amounts_non_negative CHECK (
        opening_amount >= 0
        AND (counted_amount IS NULL OR counted_amount >= 0)
        AND (expected_cash_amount IS NULL OR expected_cash_amount >= 0)
    )
);

CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    cash_register_session_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    sale_number VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL,
    subtotal_amount NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    paid_amount NUMERIC(14,2) NOT NULL,
    change_amount NUMERIC(14,2) NOT NULL,
    sold_at TIMESTAMPTZ NOT NULL,
    voided_at TIMESTAMPTZ,
    voided_by_user_id UUID,
    void_reason VARCHAR(400),
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sales_cash_register FOREIGN KEY (cash_register_session_id) REFERENCES cash_register_sessions (id),
    CONSTRAINT fk_sales_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_sales_voided_user FOREIGN KEY (voided_by_user_id) REFERENCES users (id),
    CONSTRAINT chk_sales_status CHECK (status IN ('COMPLETED','VOIDED')),
    CONSTRAINT chk_sales_amounts_non_negative CHECK (
        subtotal_amount >= 0
        AND discount_amount >= 0
        AND total_amount >= 0
        AND paid_amount >= 0
        AND change_amount >= 0
    )
);

CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity NUMERIC(16,3) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL,
    line_total NUMERIC(14,2) NOT NULL,
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT chk_sale_items_values CHECK (
        quantity > 0
        AND unit_price >= 0
        AND discount_amount >= 0
        AND line_total >= 0
    )
);

CREATE TABLE IF NOT EXISTS sale_payments (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    reference VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sale_payments_sale FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
    CONSTRAINT chk_sale_payments_method CHECK (payment_method IN ('CASH','CARD','TRANSFER')),
    CONSTRAINT chk_sale_payments_amount_positive CHECK (amount > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_sale_number ON sales (sale_number);
CREATE INDEX IF NOT EXISTS idx_cash_register_opened_by_user_id ON cash_register_sessions (opened_by_user_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_status ON cash_register_sessions (status);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales (sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (status);
CREATE INDEX IF NOT EXISTS idx_sales_cash_register ON sales (cash_register_session_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments (sale_id);

