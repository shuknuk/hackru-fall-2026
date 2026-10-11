import "server-only";
import { databasePool } from "./index";

export async function dailyAnalytics(userId: string, days: number) {
  const result = await databasePool().query(
    `SELECT bucket AS day, session_count AS "sessionCount", total_reps AS "totalReps",
      average_tracking_coverage AS "averageTrackingCoverage",
      average_duration_ms AS "averageDurationMs"
     FROM daily_workout_stats
     WHERE clerk_user_id = $1 AND bucket >= time_bucket('1 day', now()) - ($2::int - 1) * interval '1 day'
     ORDER BY bucket ASC`,
    [userId, days],
  );
  return result.rows;
}
