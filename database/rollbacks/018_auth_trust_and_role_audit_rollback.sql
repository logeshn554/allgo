-- ==============================================================================
-- Rollback 018: Trusted admin identity mapping and role grant audit
-- This drops only the structures introduced by migration 018.
-- Export/retain populated audit and allowlist data before running.
-- Do not run automatically during application rollback.
-- ==============================================================================

BEGIN;

DROP TABLE IF EXISTS auth_role_grant_audit;
DROP TABLE IF EXISTS admin_identity_allowlist;

COMMIT;
