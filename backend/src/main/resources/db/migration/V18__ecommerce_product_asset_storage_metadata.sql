ALTER TABLE ecommerce_product_assets
    ADD COLUMN storage_provider VARCHAR(30),
    ADD COLUMN storage_bucket VARCHAR(255),
    ADD COLUMN storage_key VARCHAR(1000),
    ADD COLUMN mime_type VARCHAR(100),
    ADD COLUMN width INTEGER,
    ADD COLUMN height INTEGER,
    ADD COLUMN size_bytes BIGINT,
    ADD COLUMN checksum_sha256 VARCHAR(64),
    ADD COLUMN original_filename VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_ecommerce_assets_storage_key
    ON ecommerce_product_assets (storage_key)
    WHERE storage_key IS NOT NULL;
