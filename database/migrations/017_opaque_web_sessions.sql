-- ==============================================================================
-- Migration 017: Opaque HttpOnly Web Sessions on Devices
-- ==============================================================================

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS session_token_hash VARCHAR(128),
  ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_devices_session_token_hash
  ON devices (session_token_hash)
  WHERE session_token_hash IS NOT NULL;
