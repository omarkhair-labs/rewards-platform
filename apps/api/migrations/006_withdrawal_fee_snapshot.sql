BEGIN;

ALTER TABLE withdrawals
  ADD COLUMN IF NOT EXISTS payout_method_catalog_id BIGINT REFERENCES payout_method_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fee_bps INTEGER NOT NULL DEFAULT 0 CHECK (fee_bps >= 0 AND fee_bps <= 10000),
  ADD COLUMN IF NOT EXISTS fee_points BIGINT NOT NULL DEFAULT 0 CHECK (fee_points >= 0),
  ADD COLUMN IF NOT EXISTS net_points BIGINT;

UPDATE withdrawals
SET net_points = points - fee_points
WHERE net_points IS NULL;

ALTER TABLE withdrawals
  ALTER COLUMN net_points SET NOT NULL;

ALTER TABLE withdrawals
  ADD CONSTRAINT withdrawals_net_points_positive CHECK (net_points > 0);

COMMIT;
