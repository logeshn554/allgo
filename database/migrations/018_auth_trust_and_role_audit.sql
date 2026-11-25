-- ==============================================================================
-- Migration 018: Trusted admin identity mapping and role grant audit
-- Additive only. Does not create users, grant roles, or alter business records.
-- Apply in a transaction in a non-production environment after a verified backup.
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS admin_identity_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    identity_type VARCHAR(16) NOT NULL,
    identity_value VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_admin_identity_type CHECK (identity_type IN ('PHONE', 'EMAIL')),
    CONSTRAINT chk_admin_identity_value CHECK (
      (identity_type = 'PHONE' AND identity_value ~ '^\+91[6-9][0-9]{9}$')
      OR
      (identity_type = 'EMAIL' AND identity_value = LOWER(BTRIM(identity_value)) AND POSITION('@' IN identity_value) > 1)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_identity_allowlist_value
    ON admin_identity_allowlist (identity_type, identity_value);

CREATE INDEX IF NOT EXISTS idx_admin_identity_allowlist_user
    ON admin_identity_allowlist (user_id);

CREATE TABLE IF NOT EXISTS auth_role_grant_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    action VARCHAR(16) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    grant_source VARCHAR(64) NOT NULL,
    approval_reference VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_auth_role_grant_action CHECK (action IN ('GRANT', 'REVOKE'))
);

CREATE INDEX IF NOT EXISTS idx_auth_role_grant_audit_subject
    ON auth_role_grant_audit (subject_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_role_grant_audit_actor
    ON auth_role_grant_audit (actor_user_id, created_at DESC);

COMMIT;
