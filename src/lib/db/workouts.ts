import "server-only";
import type { PoolClient } from "pg";
import type { WorkoutSummary } from "@/lib/cloud/workout-summary";
import { databasePool } from "./index";

export async function insertWorkoutWithClient(client: PoolClient, userId: string, workout: WorkoutSummary) {
  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO app_users (clerk_user_id) VALUES ($1)
       ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = now()`,
      [userId],
    );
    const key = await client.query(
      `INSERT INTO workout_session_keys (clerk_user_id, session_id, recorded_at)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING session_id`,
      [userId, workout.sessionId, workout.recordedAt],
    );
    if (key.rowCount) await client.query(
      `INSERT INTO workout_metrics
       (recorded_at, clerk_user_id, session_id, exercise_type, source, status, rep_count,
        duration_ms, median_knee_bend, knee_variation, median_ascent_ms,
        tracking_coverage, visible_side, algorithm_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [workout.recordedAt, userId, workout.sessionId, workout.exerciseType, workout.source,
        workout.status, workout.repCount, workout.durationMs, workout.medianKneeBend,
        workout.kneeVariation, workout.medianAscentMs, workout.trackingCoverage,
        workout.visibleSide, workout.algorithmVersion],
    );
    await client.query("COMMIT");
    return { created: Boolean(key.rowCount) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
export async function insertWorkout(userId: string, workout: WorkoutSummary) {
  const client = await databasePool().connect();
  try { return await insertWorkoutWithClient(client, userId, workout); }
  finally { client.release(); }
}
export async function listWorkouts(userId: string, limit: number, before?: string) {
  const result = await databasePool().query(
    `SELECT recorded_at AS "recordedAt", session_id AS "sessionId", exercise_type AS "exerciseType",
      source, status, rep_count AS "repCount", duration_ms AS "durationMs",
      median_knee_bend AS "medianKneeBend", knee_variation AS "kneeVariation",
      median_ascent_ms AS "medianAscentMs", tracking_coverage AS "trackingCoverage",
      visible_side AS "visibleSide", algorithm_version AS "algorithmVersion"
     FROM workout_metrics
     WHERE clerk_user_id = $1 AND ($2::timestamptz IS NULL OR recorded_at < $2)
     ORDER BY recorded_at DESC LIMIT $3`,
    [userId, before ?? null, limit],
  );
  return result.rows;
}
export async function deleteWorkout(userId: string, sessionId: string) {
  const client = await databasePool().connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query(
      "DELETE FROM workout_metrics WHERE clerk_user_id = $1 AND session_id = $2 RETURNING session_id",
      [userId, sessionId],
    );
    if (deleted.rowCount) await client.query(
      "DELETE FROM workout_session_keys WHERE clerk_user_id = $1 AND session_id = $2",
      [userId, sessionId],
    );
    await client.query("COMMIT");
    return Boolean(deleted.rowCount);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
