INSERT INTO roles (name)
VALUES ('ADMIN'), ('CAJERO'), ('ALMACENERO'), ('SUPERVISOR')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (id, username, email, password_hash, active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@erp.local',
    crypt('Admin123!', gen_salt('bf')),
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ADMIN'
WHERE u.username = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

