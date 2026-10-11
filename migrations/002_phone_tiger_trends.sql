DO $$
BEGIN
  IF to_regclass('public.app_users') IS NOT NULL AND to_regclass('public.workout_devices') IS NULL THEN
    ALTER TABLE app_users RENAME TO workout_devices;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_devices' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE workout_devices RENAME COLUMN clerk_user_id TO device_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_session_keys' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE workout_session_keys RENAME COLUMN clerk_user_id TO device_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_metrics' AND column_name = 'clerk_user_id') THEN
    ALTER TABLE workout_metrics RENAME COLUMN clerk_user_id TO device_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'workout_metrics_user_recorded_at_idx') THEN
    ALTER INDEX workout_metrics_user_recorded_at_idx RENAME TO workout_metrics_device_recorded_at_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.daily_workout_stats') AND attname = 'clerk_user_id' AND NOT attisdropped) THEN
    ALTER MATERIALIZED VIEW daily_workout_stats RENAME COLUMN clerk_user_id TO device_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'menhel_app') THEN
    GRANT DELETE ON workout_devices TO menhel_app;
  END IF;
END $$;
