CREATE TABLE sale_operations (
    actor_user_id UUID NOT NULL REFERENCES users(id),
    operation_id UUID NOT NULL,
    request_hash CHAR(64) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    -- Retain the operation after existing authorized administrative purges; never reuse its identity.
    -- A NULL result is a tombstone, not permission to create another sale.
    sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_user_id, operation_id),
    CONSTRAINT uq_sale_operations_sale UNIQUE (sale_id)
);
