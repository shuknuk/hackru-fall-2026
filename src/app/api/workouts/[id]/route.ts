import { NextResponse } from "next/server";
import { z } from "zod";
import { DeviceAuthError, requireDevice } from "@/lib/device/require-device";
import { deleteWorkout } from "@/lib/db/workouts";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const deviceId = requireDevice(_request);
    const id = z.string().uuid().safeParse((await params).id);
    if (!id.success) return NextResponse.json({ error: "Workout id is invalid." }, { status: 400, headers });
    const deleted = await deleteWorkout(deviceId, id.data);
    return deleted
      ? NextResponse.json({ deleted: true }, { headers })
      : NextResponse.json({ error: "Workout was not found." }, { status: 404, headers });
  } catch (error) {
    if (error instanceof DeviceAuthError) return NextResponse.json({ error: error.message }, { status: 401, headers });
    console.error("Tiger Data workout delete failed", { reason: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "Cloud deletion is pending. Your local workout is unchanged." }, { status: 503, headers });
  }
}
