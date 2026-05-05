DO $$
DECLARE
    harden_default_seed_users BOOLEAN := LOWER('${harden_default_seed_users}') IN ('true', '1', 'yes', 'y', 'on');
    harden_default_seed_users_include_admin BOOLEAN := LOWER('${harden_default_seed_users_include_admin}') IN ('true', '1', 'yes', 'y', 'on');
BEGIN
    -- One-time hardening gate for non-local environments.
    IF harden_default_seed_users THEN
        UPDATE users
        SET active = FALSE,
            updated_at = NOW()
        WHERE LOWER(username) IN ('cajero', 'almacenero', 'supervisor')
           OR LOWER(email) IN ('cajero@erp.local', 'almacenero@erp.local', 'supervisor@erp.local');

        IF harden_default_seed_users_include_admin THEN
            UPDATE users
            SET active = FALSE,
                updated_at = NOW()
            WHERE LOWER(username) = 'admin'
               OR LOWER(email) = 'admin@erp.local';
        END IF;
    END IF;
END $$;

