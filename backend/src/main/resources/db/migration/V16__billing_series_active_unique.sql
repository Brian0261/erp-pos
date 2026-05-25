DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM billing_series
        WHERE active = TRUE
        GROUP BY document_type, environment
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'No se puede crear uq_billing_series_doc_type_environment_active: existen series activas duplicadas por tipo y ambiente.';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_series_doc_type_environment_active
    ON billing_series (document_type, environment)
    WHERE active = TRUE;
