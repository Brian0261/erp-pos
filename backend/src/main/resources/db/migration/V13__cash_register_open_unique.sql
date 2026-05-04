DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM cash_register_sessions
        WHERE status = 'OPEN'
        GROUP BY opened_by_user_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'No se puede crear uq_cash_register_sessions_opened_by_user_open: existen usuarios con mas de una caja OPEN.';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_register_sessions_opened_by_user_open
    ON cash_register_sessions (opened_by_user_id)
    WHERE status = 'OPEN';

