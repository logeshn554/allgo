-- ==============================================================================
-- Migration 016: Two-Factor Authentication (TOTP + Backup Codes) & Policy
-- ==============================================================================

-- 1. Extend users table with 2FA TOTP secret & backup recovery codes
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes_hash JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ;

-- 2. Extend auth_settings with global Two-Factor Authentication policy
ALTER TABLE auth_settings
  ADD COLUMN IF NOT EXISTS two_factor_policy VARCHAR(32) NOT NULL DEFAULT 'OPTIONAL';

ALTER TABLE auth_settings
  DROP CONSTRAINT IF EXISTS chk_auth_settings_2fa_policy;

ALTER TABLE auth_settings
  ADD CONSTRAINT chk_auth_settings_2fa_policy
  CHECK (two_factor_policy IN ('DISABLED', 'OPTIONAL', 'REQUIRED_FOR_ADMINS', 'REQUIRED_FOR_ALL'));
