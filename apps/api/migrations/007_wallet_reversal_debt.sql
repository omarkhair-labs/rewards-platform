BEGIN;

ALTER TABLE wallet_accounts
  ADD COLUMN IF NOT EXISTS debt_points BIGINT NOT NULL DEFAULT 0 CHECK (debt_points >= 0);

ALTER TABLE wallet_entries
  ADD COLUMN IF NOT EXISTS debt_delta BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debt_after BIGINT NOT NULL DEFAULT 0 CHECK (debt_after >= 0);

UPDATE wallet_entries we
SET debt_after = wa.debt_points
FROM wallet_accounts wa
WHERE wa.user_id=we.user_id
  AND we.debt_after=0;

COMMIT;
