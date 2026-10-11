import "server-only";
import { databasePool } from "./index";

export async function dailyAnalytics(deviceId: string, days: number) {
  const result = await databasePool().query(
    `SELECT time_bucket('1 day', recorded_at) AS day, count(*)::int AS "sessionCount",
      sum(rep_count)::int AS "totalReps", avg(tracking_coverage) AS "averageTrackingCoverage",
      avg(duration_ms) AS "averageDurationMs"
     FROM workout_metrics
     WHERE device_id = $1 AND recorded_at >= time_bucket('1 day', now()) - ($2::int - 1) * interval '1 day'
     GROUP BY day ORDER BY day ASC`,
    [deviceId, days],
  );
  return result.rows;
}
