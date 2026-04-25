INSERT INTO units (code, name, active, created_by, updated_by)
SELECT 'UND', 'Unidad', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM units WHERE LOWER(code) = LOWER('UND'));

INSERT INTO units (code, name, active, created_by, updated_by)
SELECT 'PQT', 'Paquete', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM units WHERE LOWER(code) = LOWER('PQT'));

INSERT INTO units (code, name, active, created_by, updated_by)
SELECT 'CJA', 'Caja', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM units WHERE LOWER(code) = LOWER('CJA'));

INSERT INTO units (code, name, active, created_by, updated_by)
SELECT 'PLG', 'Pliego', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM units WHERE LOWER(code) = LOWER('PLG'));

INSERT INTO categories (name, description, active, created_by, updated_by)
SELECT 'Cuadernos', 'Productos de cuadernos escolares', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER('Cuadernos'));

INSERT INTO categories (name, description, active, created_by, updated_by)
SELECT 'Lapiceros', 'Lapiceros y boligrafos', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER('Lapiceros'));

INSERT INTO categories (name, description, active, created_by, updated_by)
SELECT 'Papeles', 'Hojas y papeles', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER('Papeles'));

INSERT INTO categories (name, description, active, created_by, updated_by)
SELECT 'Mochilas', 'Mochilas y bolsos escolares', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER('Mochilas'));

INSERT INTO categories (name, description, active, created_by, updated_by)
SELECT 'Utiles de arte', 'Materiales para arte y dibujo', TRUE, 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER('Utiles de arte'));
