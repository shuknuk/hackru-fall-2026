import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth/require-user";
import { deleteWorkout } from "@/lib/db/workouts";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const id = z.string().uuid().safeParse((await params).id);
    if (!id.success) return NextResponse.json({ error: "Workout id is invalid." }, { status: 400, headers });
    const deleted = await deleteWorkout(userId, id.data);
    return deleted
      ? NextResponse.json({ deleted: true }, { headers })
      : NextResponse.json({ error: "Workout was not found." }, { status: 404, headers });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error("Tiger Data workout delete failed", { reason: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "Cloud deletion is pending. Your local workout is unchanged." }, { status: 503, headers });
  }
}
