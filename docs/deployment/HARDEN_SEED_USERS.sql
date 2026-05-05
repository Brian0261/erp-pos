-- BT-004 manual hardening helper (outside Flyway history)
-- Use only in non-local environments when you need to disable known seed users.

-- Disable non-admin seed users
UPDATE users
SET active = FALSE,
    updated_at = NOW()
WHERE LOWER(username) IN ('cajero', 'almacenero', 'supervisor')
   OR LOWER(email) IN ('cajero@erp.local', 'almacenero@erp.local', 'supervisor@erp.local');

-- Optional: disable admin seed user
-- UPDATE users
-- SET active = FALSE,
--     updated_at = NOW()
-- WHERE LOWER(username) = 'admin'
--    OR LOWER(email) = 'admin@erp.local';

