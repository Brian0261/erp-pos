INSERT INTO users (id, username, email, password_hash, active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'cajero',
    'cajero@erp.local',
    crypt('Admin123*', gen_salt('bf')),
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(username) = LOWER('cajero') OR LOWER(email) = LOWER('cajero@erp.local')
);

INSERT INTO users (id, username, email, password_hash, active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'almacenero',
    'almacenero@erp.local',
    crypt('Admin123*', gen_salt('bf')),
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(username) = LOWER('almacenero') OR LOWER(email) = LOWER('almacenero@erp.local')
);

INSERT INTO users (id, username, email, password_hash, active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'supervisor',
    'supervisor@erp.local',
    crypt('Admin123*', gen_salt('bf')),
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(username) = LOWER('supervisor') OR LOWER(email) = LOWER('supervisor@erp.local')
);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'CAJERO'
WHERE LOWER(u.username) = LOWER('cajero')
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ALMACENERO'
WHERE LOWER(u.username) = LOWER('almacenero')
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'SUPERVISOR'
WHERE LOWER(u.username) = LOWER('supervisor')
ON CONFLICT (user_id, role_id) DO NOTHING;

