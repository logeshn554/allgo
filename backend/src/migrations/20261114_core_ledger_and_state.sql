CREATE TABLE IF NOT EXISTS account_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id VARCHAR(64) NOT NULL,
  account_type VARCHAR(64) NOT NULL,
  debit_cents BIGINT NOT NULL DEFAULT 0,
  credit_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_ledgers_ref ON account_ledgers(reference_id);
CREATE INDEX IF NOT EXISTS idx_account_ledgers_type ON account_ledgers(account_type);

CREATE TABLE IF NOT EXISTS order_saga_state (
  order_id VARCHAR(64) PRIMARY KEY,
  current_state VARCHAR(32) NOT NULL,
  retry_count INT DEFAULT 0,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
