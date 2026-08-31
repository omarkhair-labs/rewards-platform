BEGIN;

CREATE TABLE IF NOT EXISTS level_rules (
  level INTEGER PRIMARY KEY CHECK (level > 0),
  rank TEXT NOT NULL UNIQUE,
  min_lifetime_points BIGINT NOT NULL UNIQUE CHECK (min_lifetime_points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO level_rules(level,rank,min_lifetime_points) VALUES
  (1,'Bronze',0),
  (2,'Silver',5000),
  (3,'Gold',25000),
  (4,'Platinum',100000),
  (5,'Diamond',250000)
ON CONFLICT (level) DO NOTHING;

COMMIT;
