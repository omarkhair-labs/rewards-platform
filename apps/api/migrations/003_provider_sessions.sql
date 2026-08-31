BEGIN;

CREATE TABLE provider_sessions (
  id UUID PRIMARY KEY,
  provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_transaction_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('offer','survey')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(provider_id, external_transaction_id)
);

CREATE INDEX idx_provider_sessions_user_created
  ON provider_sessions(user_id, created_at DESC);

COMMIT;
