DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM electronic_documents
        WHERE status <> 'CANCELLED'
        GROUP BY sale_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'No se puede crear uq_electronic_documents_sale_active: existen comprobantes activos duplicados por venta.';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_documents_sale_active
    ON electronic_documents (sale_id)
    WHERE status <> 'CANCELLED';
