CREATE TABLE IF NOT EXISTS warehouses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(140) NOT NULL,
    type VARCHAR(30) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS stock_balances (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    quantity NUMERIC(16,3) NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_stock_balances_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_stock_balances_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT chk_stock_balances_quantity_non_negative CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    movement_type VARCHAR(30) NOT NULL,
    quantity NUMERIC(16,3) NOT NULL,
    previous_stock NUMERIC(16,3) NOT NULL,
    new_stock NUMERIC(16,3) NOT NULL,
    reason VARCHAR(300) NOT NULL,
    reference_type VARCHAR(40),
    reference_id VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    CONSTRAINT fk_inventory_movements_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_inventory_movements_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT chk_inventory_movement_quantity_positive CHECK (quantity >= 0),
    CONSTRAINT chk_inventory_movement_stocks_non_negative CHECK (previous_stock >= 0 AND new_stock >= 0)
);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id BIGSERIAL PRIMARY KEY,
    source_warehouse_id BIGINT NOT NULL,
    target_warehouse_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    reason VARCHAR(300) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    CONSTRAINT fk_stock_transfers_source_warehouse FOREIGN KEY (source_warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_stock_transfers_target_warehouse FOREIGN KEY (target_warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT chk_stock_transfers_distinct_warehouses CHECK (source_warehouse_id <> target_warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id BIGSERIAL PRIMARY KEY,
    transfer_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity NUMERIC(16,3) NOT NULL,
    CONSTRAINT fk_stock_transfer_items_transfer FOREIGN KEY (transfer_id) REFERENCES stock_transfers (id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_transfer_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT chk_stock_transfer_items_quantity_positive CHECK (quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_code ON warehouses (LOWER(code));
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_balances_product_warehouse ON stock_balances (product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_stock_balances_product ON stock_balances (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_warehouse ON stock_balances (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON inventory_movements (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON stock_transfer_items (transfer_id);


