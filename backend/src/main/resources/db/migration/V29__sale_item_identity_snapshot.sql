-- Preserve historical rows without inferring product identity from the current catalog.
ALTER TABLE sale_items
    ADD COLUMN product_name_snapshot VARCHAR(180),
    ADD COLUMN sku_snapshot VARCHAR(60),
    ADD CONSTRAINT chk_sale_items_identity_snapshot_pair CHECK (
        (product_name_snapshot IS NULL) = (sku_snapshot IS NULL)
    );

-- No nonblank check: the existing catalog schema permits legacy empty/whitespace values.
