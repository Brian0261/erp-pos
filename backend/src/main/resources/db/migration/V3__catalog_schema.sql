CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(400),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS units (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(120) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(60) NOT NULL,
    barcode VARCHAR(50),
    name VARCHAR(180) NOT NULL,
    description VARCHAR(500),
    category_id BIGINT NOT NULL,
    unit_id BIGINT NOT NULL,
    sale_price NUMERIC(14,2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) REFERENCES units (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name ON categories (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_units_code ON units (LOWER(code));
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku ON products (LOWER(sku));
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_barcode_not_null ON products (barcode) WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_name ON products (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_unit ON products (unit_id);

