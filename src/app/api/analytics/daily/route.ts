import { NextResponse } from "next/server";
import { z } from "zod";
import { DeviceAuthError, requireDevice } from "@/lib/device/require-device";
import { dailyAnalytics } from "@/lib/db/analytics";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const deviceId = requireDevice(request);
    const parsed = z.coerce.number().pipe(z.union([z.literal(7), z.literal(30)])).safeParse(new URL(request.url).searchParams.get("days") ?? 30);
    if (!parsed.success) return NextResponse.json({ error: "Analytics period must be 7 or 30 days." }, { status: 400, headers });
    return NextResponse.json({ days: await dailyAnalytics(deviceId, parsed.data), timezone: "UTC" }, { headers });
  } catch (error) {
    if (error instanceof DeviceAuthError) return NextResponse.json({ error: error.message }, { status: 401, headers });
    console.error("Tiger Data analytics request failed", { reason: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "Cloud analytics are temporarily unavailable." }, { status: 503, headers });
  }
}
