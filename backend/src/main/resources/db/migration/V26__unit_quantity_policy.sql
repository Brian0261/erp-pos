ALTER TABLE units ADD COLUMN quantity_policy VARCHAR(16);
ALTER TABLE units ADD CONSTRAINT ck_units_quantity_policy
    CHECK (quantity_policy IS NULL OR quantity_policy IN ('WHOLE', 'DECIMAL_2'));
