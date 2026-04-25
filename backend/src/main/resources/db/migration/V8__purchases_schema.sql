CREATE TABLE IF NOT EXISTS suppliers (
    id BIGSERIAL PRIMARY KEY,
    document_number VARCHAR(40),
    name VARCHAR(180) NOT NULL,
    contact_name VARCHAR(120),
    phone VARCHAR(40),
    email VARCHAR(160),
    address VARCHAR(300),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE,
    total_amount NUMERIC(14,2) NOT NULL,
    notes VARCHAR(400),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120),
    CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
    CONSTRAINT fk_purchase_orders_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity_ordered NUMERIC(16,3) NOT NULL,
    quantity_received NUMERIC(16,3) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(14,2) NOT NULL,
    line_total NUMERIC(14,2) NOT NULL,
    CONSTRAINT fk_purchase_order_items_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_order_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT chk_purchase_order_items_qty_ordered_positive CHECK (quantity_ordered > 0),
    CONSTRAINT chk_purchase_order_items_qty_received_non_negative CHECK (quantity_received >= 0),
    CONSTRAINT chk_purchase_order_items_unit_cost_non_negative CHECK (unit_cost >= 0),
    CONSTRAINT chk_purchase_order_items_line_total_non_negative CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS purchase_receipts (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL,
    receipt_date DATE NOT NULL,
    notes VARCHAR(400),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    CONSTRAINT fk_purchase_receipts_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id)
);

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_receipt_id BIGINT NOT NULL,
    purchase_order_item_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity_received NUMERIC(16,3) NOT NULL,
    CONSTRAINT fk_purchase_receipt_items_receipt FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts (id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_receipt_items_order_item FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items (id),
    CONSTRAINT fk_purchase_receipt_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT chk_purchase_receipt_items_qty_positive CHECK (quantity_received > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_document_number_not_null ON suppliers (LOWER(document_number)) WHERE document_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders (order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_order ON purchase_receipts (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_receipt ON purchase_receipt_items (purchase_receipt_id);

