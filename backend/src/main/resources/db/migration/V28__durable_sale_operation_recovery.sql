-- V27 identities and tombstones remain authoritative. Existing rows are terminal legacy results.
ALTER TABLE sale_operations
    ADD COLUMN protocol_version INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN origin VARCHAR(8) NOT NULL DEFAULT 'LEGACY',
    ADD COLUMN state VARCHAR(12) NOT NULL DEFAULT 'COMPLETED',
    ADD COLUMN command_snapshot JSONB,
    ADD COLUMN quote_id BIGINT REFERENCES quotes(id),
    ADD COLUMN quote_snapshot JSONB,
    ADD COLUMN receipt_intent JSONB,
    ADD COLUMN intent_hash CHAR(64),
    ADD COLUMN original_cash_session_id BIGINT REFERENCES cash_register_sessions(id),
    ADD COLUMN document_id BIGINT REFERENCES electronic_documents(id) ON DELETE SET NULL,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE sale_operations ADD CONSTRAINT ck_sale_operation_protocol CHECK (
    (protocol_version = 0 AND origin = 'LEGACY' AND state = 'COMPLETED') OR
    (protocol_version = 1 AND origin IN ('POS','QUOTE') AND original_cash_session_id IS NOT NULL
        AND intent_hash IS NOT NULL AND intent_hash ~ '^[0-9a-f]{64}$'
        AND ((origin='POS' AND quote_id IS NULL AND receipt_intent IS NOT NULL AND quote_snapshot IS NULL)
            OR (origin='QUOTE' AND quote_id IS NOT NULL AND receipt_intent IS NULL))
        AND ((state = 'PREPARED' AND sale_id IS NULL AND command_snapshot IS NOT NULL)
            OR (state = 'COMPLETED') OR (state = 'CANCELLED' AND sale_id IS NULL)))
);
ALTER TABLE sale_operations ADD CONSTRAINT ck_sale_operation_state
    CHECK (state IN ('PREPARED','COMPLETED','CANCELLED'));
CREATE INDEX ix_sale_operations_owner_recent ON sale_operations(actor_user_id, created_at DESC, operation_id);
CREATE INDEX ix_sale_operations_owner_pending ON sale_operations(actor_user_id, state, created_at DESC);

-- Revalidate the existing V22 guarantee; imported incompatible history must stop the upgrade.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM electronic_documents WHERE status <> 'CANCELLED' GROUP BY sale_id HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Cannot enable recovery: incompatible active electronic documents for one sale';
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_documents_sale_active
    ON electronic_documents(sale_id) WHERE status <> 'CANCELLED';
