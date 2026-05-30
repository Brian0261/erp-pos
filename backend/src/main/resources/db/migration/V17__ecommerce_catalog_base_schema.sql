CREATE TABLE IF NOT EXISTS ecommerce_brands (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(140) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description VARCHAR(800),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS ecommerce_online_categories (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT,
    name VARCHAR(140) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description VARCHAR(1000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120),
    CONSTRAINT fk_ecommerce_online_categories_parent FOREIGN KEY (parent_id) REFERENCES ecommerce_online_categories (id) ON DELETE SET NULL,
    CONSTRAINT chk_ecommerce_online_categories_parent_self CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE TABLE IF NOT EXISTS ecommerce_product_online_profiles (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    publication_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    slug VARCHAR(180),
    online_name VARCHAR(180),
    online_description VARCHAR(2000),
    online_category_id BIGINT,
    brand_id BIGINT,
    brand_absence_policy VARCHAR(30),
    published_at TIMESTAMPTZ,
    unpublished_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120),
    CONSTRAINT fk_ecommerce_profiles_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_ecommerce_profiles_online_category FOREIGN KEY (online_category_id) REFERENCES ecommerce_online_categories (id),
    CONSTRAINT fk_ecommerce_profiles_brand FOREIGN KEY (brand_id) REFERENCES ecommerce_brands (id),
    CONSTRAINT uq_ecommerce_profiles_product UNIQUE (product_id),
    CONSTRAINT chk_ecommerce_profiles_status CHECK (publication_status IN ('DRAFT','INCOMPLETE','READY_FOR_REVIEW','PUBLISHED','UNPUBLISHED','BLOCKED')),
    CONSTRAINT chk_ecommerce_profiles_brand_absence_policy CHECK (brand_absence_policy IS NULL OR brand_absence_policy IN ('GENERIC','UNBRANDED')),
    CONSTRAINT chk_ecommerce_profiles_brand_or_absence CHECK (brand_id IS NULL OR brand_absence_policy IS NULL)
);

CREATE TABLE IF NOT EXISTS ecommerce_seo_metadata (
    id BIGSERIAL PRIMARY KEY,
    product_online_profile_id BIGINT,
    online_category_id BIGINT,
    brand_id BIGINT,
    seo_title VARCHAR(90),
    seo_description VARCHAR(220),
    canonical_path VARCHAR(255),
    robots_policy VARCHAR(30) NOT NULL DEFAULT 'NOINDEX_FOLLOW',
    indexable BOOLEAN NOT NULL DEFAULT FALSE,
    og_title VARCHAR(120),
    og_description VARCHAR(260),
    og_image_url VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120),
    CONSTRAINT fk_ecommerce_seo_profile FOREIGN KEY (product_online_profile_id) REFERENCES ecommerce_product_online_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_ecommerce_seo_online_category FOREIGN KEY (online_category_id) REFERENCES ecommerce_online_categories (id) ON DELETE CASCADE,
    CONSTRAINT fk_ecommerce_seo_brand FOREIGN KEY (brand_id) REFERENCES ecommerce_brands (id) ON DELETE CASCADE,
    CONSTRAINT chk_ecommerce_seo_target_one CHECK (num_nonnulls(product_online_profile_id, online_category_id, brand_id) = 1),
    CONSTRAINT chk_ecommerce_seo_robots_policy CHECK (robots_policy IN ('INDEX_FOLLOW','NOINDEX_FOLLOW','NOINDEX_NOFOLLOW'))
);

CREATE TABLE IF NOT EXISTS ecommerce_product_assets (
    id BIGSERIAL PRIMARY KEY,
    product_online_profile_id BIGINT NOT NULL,
    asset_type VARCHAR(30) NOT NULL,
    asset_url VARCHAR(1000) NOT NULL,
    alt_text VARCHAR(180),
    source VARCHAR(30) NOT NULL,
    rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120),
    CONSTRAINT fk_ecommerce_assets_profile FOREIGN KEY (product_online_profile_id) REFERENCES ecommerce_product_online_profiles (id) ON DELETE CASCADE,
    CONSTRAINT chk_ecommerce_assets_type CHECK (asset_type IN ('PRODUCT_IMAGE','BRAND_LOGO','CATEGORY_IMAGE','OPEN_GRAPH_IMAGE')),
    CONSTRAINT chk_ecommerce_assets_source CHECK (source IN ('SUPPLIER','OWN','GENERATED','OTHER')),
    CONSTRAINT chk_ecommerce_assets_display_order CHECK (display_order >= 0)
);

CREATE TABLE IF NOT EXISTS ecommerce_online_price_overrides (
    id BIGSERIAL PRIMARY KEY,
    product_online_profile_id BIGINT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PEN',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    reason VARCHAR(300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(120),
    updated_by VARCHAR(120),
    CONSTRAINT fk_ecommerce_price_overrides_profile FOREIGN KEY (product_online_profile_id) REFERENCES ecommerce_product_online_profiles (id) ON DELETE CASCADE,
    CONSTRAINT chk_ecommerce_price_overrides_amount CHECK (amount > 0),
    CONSTRAINT chk_ecommerce_price_overrides_currency CHECK (currency = 'PEN'),
    CONSTRAINT chk_ecommerce_price_overrides_validity CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_brands_name ON ecommerce_brands (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_brands_slug ON ecommerce_brands (LOWER(slug));
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_online_categories_slug ON ecommerce_online_categories (LOWER(slug));
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_profiles_slug ON ecommerce_product_online_profiles (LOWER(slug)) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_seo_profile ON ecommerce_seo_metadata (product_online_profile_id) WHERE product_online_profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_seo_online_category ON ecommerce_seo_metadata (online_category_id) WHERE online_category_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_seo_brand ON ecommerce_seo_metadata (brand_id) WHERE brand_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_assets_active_primary ON ecommerce_product_assets (product_online_profile_id) WHERE is_primary = TRUE AND active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_price_overrides_active ON ecommerce_online_price_overrides (product_online_profile_id) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ecommerce_online_categories_parent ON ecommerce_online_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_profiles_status ON ecommerce_product_online_profiles (publication_status);
CREATE INDEX IF NOT EXISTS idx_ecommerce_profiles_online_category ON ecommerce_product_online_profiles (online_category_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_profiles_brand ON ecommerce_product_online_profiles (brand_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_assets_profile ON ecommerce_product_assets (product_online_profile_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_price_overrides_profile ON ecommerce_online_price_overrides (product_online_profile_id);
