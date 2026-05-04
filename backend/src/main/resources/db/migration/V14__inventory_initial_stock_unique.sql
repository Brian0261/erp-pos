DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inventory_movements
        WHERE movement_type = 'INITIAL_STOCK'
        GROUP BY product_id, warehouse_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'No se puede crear uq_inventory_movements_initial_stock_product_warehouse: existen duplicados INITIAL_STOCK por producto y almacen.';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_initial_stock_product_warehouse
    ON inventory_movements (product_id, warehouse_id)
    WHERE movement_type = 'INITIAL_STOCK';

