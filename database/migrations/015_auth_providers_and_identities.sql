-- ==============================================================================
-- Migration 015: Multi-Method Auth Manager, OAuth Providers, Linked Identities & Devices
-- ==============================================================================

-- 1. Extend users table for multi-provider authentication (Email + Password, Email OTP, OAuth, Phone)
ALTER TABLE users
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN firebase_uid DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_method VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique
  ON users (LOWER(email))
  WHERE email IS NOT NULL;

-- 2. Extend devices table for device metadata & login method tracking
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS device_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64),
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS login_method VARCHAR(64) DEFAULT 'PHONE_OTP';

-- 3. Global Auth Manager Settings (singleton row id = 1)
CREATE TABLE IF NOT EXISTS auth_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  phone_otp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_password_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_otp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  oauth_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_self_signup BOOLEAN NOT NULL DEFAULT TRUE,
  auto_link_verified_accounts BOOLEAN NOT NULL DEFAULT TRUE,
  require_email_verification BOOLEAN NOT NULL DEFAULT FALSE,
  max_devices_per_user INTEGER NOT NULL DEFAULT 5,
  access_token_ttl_seconds INTEGER NOT NULL DEFAULT 900,
  refresh_token_ttl_seconds INTEGER NOT NULL DEFAULT 604800,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO auth_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 4. Dynamic OAuth / OIDC Providers Registry
CREATE TABLE IF NOT EXISTS auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  provider_type VARCHAR(32) NOT NULL DEFAULT 'OAUTH2',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  client_id TEXT,
  client_secret_encrypted TEXT,
  scopes TEXT NOT NULL DEFAULT 'openid email profile',
  authorization_url TEXT,
  token_url TEXT,
  userinfo_url TEXT,
  issuer_url TEXT,
  auto_link BOOLEAN NOT NULL DEFAULT TRUE,
  allow_signup BOOLEAN NOT NULL DEFAULT TRUE,
  icon VARCHAR(64),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_auth_provider_type CHECK (provider_type IN ('OAUTH2', 'OIDC'))
);

INSERT INTO auth_providers (slug, display_name, provider_type, enabled, scopes, icon, sort_order)
VALUES
  ('google', 'Google', 'OIDC', FALSE, 'openid email profile', 'google', 1),
  ('github', 'GitHub', 'OAUTH2', FALSE, 'read:user user:email', 'github', 2),
  ('apple', 'Apple', 'OIDC', FALSE, 'name email', 'apple', 3),
  ('microsoft', 'Microsoft', 'OIDC', FALSE, 'openid email profile', 'microsoft', 4)
ON CONFLICT (slug) DO NOTHING;

-- 5. Linked User Identities (Phone, Email, Google, GitHub, Apple, Custom OIDC, Firebase)
CREATE TABLE IF NOT EXISTS user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  display_name VARCHAR(255),
  avatar_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities (user_id);

-- Backfill existing phone users into user_identities
INSERT INTO user_identities (user_id, provider, provider_account_id, phone, display_name, verified)
SELECT id, 'phone', phone, phone, full_name, TRUE
FROM users
WHERE phone IS NOT NULL
ON CONFLICT (provider, provider_account_id) DO NOTHING;

-- Backfill existing email users into user_identities
INSERT INTO user_identities (user_id, provider, provider_account_id, email, display_name, verified)
SELECT id, 'email', LOWER(email), LOWER(email), full_name, email_verified
FROM users
WHERE email IS NOT NULL
ON CONFLICT (provider, provider_account_id) DO NOTHING;
