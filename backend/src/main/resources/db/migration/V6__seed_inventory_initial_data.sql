INSERT INTO warehouses (code, name, type, active, created_by, updated_by)
SELECT 'STORE-01', 'Tienda Principal', 'STORE', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE LOWER(code) = LOWER('STORE-01'));

INSERT INTO warehouses (code, name, type, active, created_by, updated_by)
SELECT 'WH-01', 'Almacen Principal', 'MAIN_WAREHOUSE', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE LOWER(code) = LOWER('WH-01'));

