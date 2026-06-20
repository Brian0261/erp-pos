CREATE TABLE IF NOT EXISTS ecommerce_product_asset_variants (
    id BIGSERIAL PRIMARY KEY,
    product_asset_id BIGINT NOT NULL,
    variant_kind VARCHAR(40) NOT NULL,
    asset_url VARCHAR(1000) NOT NULL,
    storage_provider VARCHAR(30),
    storage_bucket VARCHAR(255),
    storage_key VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    source_checksum_sha256 VARCHAR(64),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    preferred BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120),
    CONSTRAINT fk_ecommerce_asset_variants_asset FOREIGN KEY (product_asset_id) REFERENCES ecommerce_product_assets (id) ON DELETE CASCADE,
    CONSTRAINT chk_ecommerce_asset_variants_kind CHECK (variant_kind IN ('PRIMARY_OPTIMIZED_WEBP')),
    CONSTRAINT chk_ecommerce_asset_variants_mime_type CHECK (mime_type = 'image/webp'),
    CONSTRAINT chk_ecommerce_asset_variants_width CHECK (width > 0),
    CONSTRAINT chk_ecommerce_asset_variants_height CHECK (height > 0),
    CONSTRAINT chk_ecommerce_asset_variants_size_bytes CHECK (size_bytes > 0),
    CONSTRAINT chk_ecommerce_asset_variants_checksum CHECK (length(checksum_sha256) = 64),
    CONSTRAINT chk_ecommerce_asset_variants_source_checksum CHECK (source_checksum_sha256 IS NULL OR length(source_checksum_sha256) = 64),
    CONSTRAINT chk_ecommerce_asset_variants_preferred_active CHECK (preferred = FALSE OR active = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_asset_variants_asset
    ON ecommerce_product_asset_variants (product_asset_id);

CREATE INDEX IF NOT EXISTS idx_ecommerce_asset_variants_storage_key
    ON ecommerce_product_asset_variants (storage_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_asset_variants_active_kind
    ON ecommerce_product_asset_variants (product_asset_id, variant_kind)
    WHERE active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_asset_variants_preferred_active
    ON ecommerce_product_asset_variants (product_asset_id)
    WHERE active = TRUE AND preferred = TRUE;
