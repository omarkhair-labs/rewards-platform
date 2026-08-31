BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username CITEXT NOT NULL UNIQUE,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
  full_name TEXT,
  avatar_url TEXT,
  country_code TEXT,
  bio TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level > 0),
  rank TEXT NOT NULL DEFAULT 'Bronze',
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  withdrawal_locked_at TIMESTAMPTZ,
  withdrawal_lock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_accounts (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  available_points BIGINT NOT NULL DEFAULT 0 CHECK (available_points >= 0),
  held_points BIGINT NOT NULL DEFAULT 0 CHECK (held_points >= 0),
  lifetime_earned_points BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_earned_points >= 0),
  version BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit','hold','release','adjustment')),
  points BIGINT NOT NULL CHECK (points > 0),
  available_delta BIGINT NOT NULL DEFAULT 0,
  held_delta BIGINT NOT NULL DEFAULT 0,
  available_after BIGINT NOT NULL CHECK (available_after >= 0),
  held_after BIGINT NOT NULL CHECK (held_after >= 0),
  source_type TEXT NOT NULL,
  source_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_entries_user_created ON wallet_entries(user_id, created_at DESC);
CREATE INDEX idx_wallet_entries_source ON wallet_entries(source_type, source_id);

CREATE TABLE providers (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('offerwall','survey','payout')),
  wall_url TEXT,
  api_base_url TEXT,
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_mode TEXT NOT NULL DEFAULT 'hmac_sha256',
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE offers (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT,
  provider_id BIGINT REFERENCES providers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  reward_points BIGINT NOT NULL CHECK (reward_points >= 0),
  image_url TEXT,
  landing_url TEXT,
  difficulty TEXT,
  estimated_minutes INTEGER,
  allowed_countries TEXT[] NOT NULL DEFAULT '{}',
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, external_id)
);
CREATE INDEX idx_offers_active_category ON offers(is_active, category);

CREATE TABLE offer_clicks (
  id BIGSERIAL PRIMARY KEY,
  offer_id BIGINT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  click_token UUID NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id BIGINT REFERENCES providers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('offer','survey','task','referral','daily','manual','reversal','watch')),
  external_transaction_id TEXT,
  reward_points BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','credited','reversed','rejected')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_reward_provider_external_tx
  ON reward_events(provider_id, external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;
CREATE INDEX idx_reward_events_user_created ON reward_events(user_id, created_at DESC);

CREATE TABLE referral_commissions (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_event_id BIGINT NOT NULL REFERENCES reward_events(id) ON DELETE CASCADE,
  commission_points BIGINT NOT NULL CHECK (commission_points > 0),
  status TEXT NOT NULL DEFAULT 'credited' CHECK (status IN ('pending','credited','reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_at TIMESTAMPTZ,
  UNIQUE(reward_event_id, referrer_user_id)
);

CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  reward_points BIGINT NOT NULL CHECK (reward_points > 0),
  image_url TEXT,
  proof_type TEXT NOT NULL DEFAULT 'url' CHECK (proof_type IN ('url','text','file','none')),
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_completions INTEGER,
  completions_count INTEGER NOT NULL DEFAULT 0,
  is_repeatable BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_submissions (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proof_url TEXT,
  proof_text TEXT,
  proof_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected')),
  reviewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX idx_task_submissions_review ON task_submissions(status, submitted_at);
CREATE UNIQUE INDEX uq_task_submission_once
  ON task_submissions(task_id, user_id)
  WHERE status IN ('pending','in_review','approved');

CREATE TABLE survey_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  birth_year INTEGER,
  gender TEXT,
  postal_code TEXT,
  country_code TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE watch_campaigns (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  reward_points BIGINT NOT NULL CHECK (reward_points > 0),
  daily_limit INTEGER NOT NULL DEFAULT 1 CHECK (daily_limit > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE watch_sessions (
  id UUID PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES watch_campaigns(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,
  ip_address INET,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_watch_user_started ON watch_sessions(user_id, started_at DESC);

CREATE TABLE withdrawal_methods (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method_key TEXT NOT NULL,
  label TEXT NOT NULL,
  account_details JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_default_withdrawal_method ON withdrawal_methods(user_id) WHERE is_default=TRUE;

CREATE TABLE withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method_id BIGINT REFERENCES withdrawal_methods(id) ON DELETE SET NULL,
  method_key TEXT NOT NULL,
  account_snapshot JSONB NOT NULL,
  points BIGINT NOT NULL CHECK (points > 0),
  cash_amount_minor BIGINT,
  cash_currency TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_review','processing','paid','rejected','cancelled','failed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  provider_reference TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_withdrawals_admin ON withdrawals(status, requested_at);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);

CREATE TABLE fraud_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);

COMMIT;
