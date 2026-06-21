ALTER TABLE ecommerce_product_asset_variants
    ADD COLUMN IF NOT EXISTS format VARCHAR(20),
    ADD COLUMN IF NOT EXISTS purpose VARCHAR(40),
    ADD COLUMN IF NOT EXISTS target_width INTEGER,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER;

UPDATE ecommerce_product_asset_variants
SET format = COALESCE(format, 'WEBP'),
    purpose = COALESCE(purpose, 'PRIMARY'),
    target_width = COALESCE(target_width, width),
    sort_order = COALESCE(sort_order, 0);

ALTER TABLE ecommerce_product_asset_variants
    ALTER COLUMN format SET NOT NULL,
    ALTER COLUMN purpose SET NOT NULL,
    ALTER COLUMN target_width SET NOT NULL,
    ALTER COLUMN sort_order SET NOT NULL;

ALTER TABLE ecommerce_product_asset_variants
    DROP CONSTRAINT IF EXISTS chk_ecommerce_asset_variants_kind,
    DROP CONSTRAINT IF EXISTS chk_ecommerce_asset_variants_mime_type;

ALTER TABLE ecommerce_product_asset_variants
    ADD CONSTRAINT chk_ecommerce_asset_variants_kind CHECK (variant_kind IN ('PRIMARY_OPTIMIZED_WEBP', 'PRIMARY_RESPONSIVE_WEBP')),
    ADD CONSTRAINT chk_ecommerce_asset_variants_mime_type CHECK (mime_type = 'image/webp'),
    ADD CONSTRAINT chk_ecommerce_asset_variants_format CHECK (format IN ('WEBP')),
    ADD CONSTRAINT chk_ecommerce_asset_variants_purpose CHECK (purpose IN ('PRIMARY', 'RESPONSIVE')),
    ADD CONSTRAINT chk_ecommerce_asset_variants_target_width CHECK (target_width > 0),
    ADD CONSTRAINT chk_ecommerce_asset_variants_sort_order CHECK (sort_order >= 0);

DROP INDEX IF EXISTS uq_ecommerce_asset_variants_active_kind;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_asset_variants_active_identity
    ON ecommerce_product_asset_variants (product_asset_id, variant_kind, format, purpose, target_width)
    WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ecommerce_asset_variants_lookup
    ON ecommerce_product_asset_variants (product_asset_id, active, purpose, format, target_width);
