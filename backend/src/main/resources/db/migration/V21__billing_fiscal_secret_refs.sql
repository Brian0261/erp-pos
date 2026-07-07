ALTER TABLE IF EXISTS company_billing_profile
    ADD COLUMN IF NOT EXISTS certificate_secret_ref VARCHAR(300),
    ADD COLUMN IF NOT EXISTS certificate_password_secret_ref VARCHAR(300),
    ADD COLUMN IF NOT EXISTS provider_secret_ref VARCHAR(300),
    ADD COLUMN IF NOT EXISTS certificate_alias VARCHAR(120),
    ADD COLUMN IF NOT EXISTS secret_provider VARCHAR(60);

COMMENT ON COLUMN company_billing_profile.certificate_path IS 'LEGACY/DEPRECATED: direct certificate path. Use certificate_secret_ref or certificate_alias.';
COMMENT ON COLUMN company_billing_profile.certificate_password IS 'LEGACY/DEPRECATED: plain certificate password. Do not write new values.';
COMMENT ON COLUMN company_billing_profile.certificate_secret_ref IS 'Reference to externally managed certificate material.';
COMMENT ON COLUMN company_billing_profile.certificate_password_secret_ref IS 'Reference to externally managed certificate password.';
COMMENT ON COLUMN company_billing_profile.provider_secret_ref IS 'Reference to externally managed fiscal provider credentials.';
