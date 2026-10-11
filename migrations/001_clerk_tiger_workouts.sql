CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS app_users (
  clerk_user_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_session_keys (
  clerk_user_id TEXT NOT NULL REFERENCES app_users(clerk_user_id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (clerk_user_id, session_id)
);

CREATE TABLE IF NOT EXISTS workout_metrics (
  recorded_at TIMESTAMPTZ NOT NULL,
  clerk_user_id TEXT NOT NULL,
  session_id UUID NOT NULL,
  exercise_type TEXT NOT NULL CHECK (exercise_type = 'bodyweight-squat'),
  source TEXT NOT NULL CHECK (source = 'live'),
  status TEXT NOT NULL CHECK (status IN ('complete', 'interrupted')),
  rep_count INTEGER NOT NULL CHECK (rep_count BETWEEN 0 AND 10),
  duration_ms INTEGER NOT NULL CHECK (duration_ms BETWEEN 0 AND 90000),
  median_knee_bend DOUBLE PRECISION CHECK (median_knee_bend BETWEEN 0 AND 180),
  knee_variation DOUBLE PRECISION CHECK (knee_variation BETWEEN 0 AND 180),
  median_ascent_ms DOUBLE PRECISION CHECK (median_ascent_ms BETWEEN 0 AND 15000),
  tracking_coverage DOUBLE PRECISION NOT NULL CHECK (tracking_coverage BETWEEN 0 AND 1),
  visible_side TEXT NOT NULL CHECK (visible_side IN ('left', 'right')),
  algorithm_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clerk_user_id, session_id, recorded_at),
  FOREIGN KEY (clerk_user_id, session_id) REFERENCES workout_session_keys(clerk_user_id, session_id) ON DELETE CASCADE
);

SELECT create_hypertable('workout_metrics', by_range('recorded_at'), if_not_exists => TRUE, migrate_data => TRUE);
CREATE INDEX IF NOT EXISTS workout_metrics_user_recorded_at_idx ON workout_metrics (clerk_user_id, recorded_at DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_workout_stats
WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 day', recorded_at) AS bucket,
  clerk_user_id,
  count(*)::INTEGER AS session_count,
  sum(rep_count)::INTEGER AS total_reps,
  avg(tracking_coverage) AS average_tracking_coverage,
  avg(duration_ms) AS average_duration_ms
FROM workout_metrics
GROUP BY bucket, clerk_user_id
WITH NO DATA;

ALTER MATERIALIZED VIEW daily_workout_stats SET (timescaledb.materialized_only = false);
SELECT add_continuous_aggregate_policy('daily_workout_stats',
  start_offset => INTERVAL '30 days', end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE);
