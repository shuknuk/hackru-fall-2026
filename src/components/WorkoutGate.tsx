"use client";

import { useCallback, useEffect, useState } from "react";
import { getGuestUsage, GUEST_WORKOUT_LIMIT } from "@/lib/motion/storage";
import { useAccount } from "./AuthContext";
import AccountPrompt from "./AccountPrompt";

export default function WorkoutGate({ children }: { children: React.ReactNode }) {
  const { loaded, userId } = useAccount();
  const [used, setUsed] = useState<number | null>(null);
  const refresh = useCallback(() => { void getGuestUsage().then(setUsed).catch(() => setUsed(null)); }, []);
  useEffect(() => {
    refresh();
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("menhel-motion");
    channel.onmessage = refresh;
    return () => channel.close();
  }, [refresh]);
  if (!loaded || (!userId && used === null)) return <p role="status">Checking workout access…</p>;
  if (userId) return <>{children}<p className="guest-quota">Signed in · unlimited workouts</p></>;
  if ((used ?? 0) >= GUEST_WORKOUT_LIMIT) return <><p className="guest-quota">5 of 5 free workouts used</p><AccountPrompt /></>;
  return <>{children}<p className="guest-quota">{used ?? 0} of 5 free workouts used</p></>;
}
