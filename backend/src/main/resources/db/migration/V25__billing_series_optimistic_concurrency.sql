ALTER TABLE billing_series
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE billing_series
    ADD CONSTRAINT chk_billing_series_version
        CHECK (version >= 0);
