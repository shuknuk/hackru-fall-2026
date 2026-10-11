import { NextResponse } from "next/server";
import { z } from "zod";
import { DeviceAuthError, requireDevice } from "@/lib/device/require-device";
import { workoutSummarySchema } from "@/lib/cloud/workout-summary";
import { deleteAllWorkouts, insertWorkout, listWorkouts } from "@/lib/db/workouts";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  if (error instanceof DeviceAuthError) return NextResponse.json({ error: error.message }, { status: 401, headers: noStore });
  console.error("Tiger Data workout request failed", { reason: error instanceof Error ? error.name : "unknown" });
  return NextResponse.json({ error: "Cloud workout storage is temporarily unavailable. Your local workout is safe." }, { status: 503, headers: noStore });
}
export async function POST(request: Request) {
  try {
    const deviceId = requireDevice(request);
    if (Number(request.headers.get("content-length") ?? 0) > 4096)
      return NextResponse.json({ error: "Workout summary is too large." }, { status: 413, headers: noStore });
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 4096)
      return NextResponse.json({ error: "Workout summary is too large." }, { status: 413, headers: noStore });
    let value: unknown;
    try { value = JSON.parse(body); }
    catch { return NextResponse.json({ error: "Workout summary is invalid." }, { status: 400, headers: noStore }); }
    const workout = workoutSummarySchema.safeParse(value);
    if (!workout.success) return NextResponse.json({ error: "Workout summary is invalid." }, { status: 400, headers: noStore });
    const result = await insertWorkout(deviceId, workout.data);
    return NextResponse.json(result, { status: result.created ? 201 : 200, headers: noStore });
  } catch (error) { return failure(error); }
}
export async function GET(request: Request) {
  try {
    const deviceId = requireDevice(request);
    const url = new URL(request.url);
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      before: z.string().datetime().optional(),
    }).safeParse(Object.fromEntries(url.searchParams));
    if (!query.success) return NextResponse.json({ error: "Workout query is invalid." }, { status: 400, headers: noStore });
    const workouts = await listWorkouts(deviceId, query.data.limit, query.data.before);
    return NextResponse.json({ workouts }, { headers: noStore });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    await deleteAllWorkouts(requireDevice(request));
    return NextResponse.json({ deleted: true }, { headers: noStore });
  } catch (error) { return failure(error); }
}
