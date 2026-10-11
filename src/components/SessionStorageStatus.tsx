"use client";

import { useEffect, useState } from "react";
import { getSessionMeta, type SyncState } from "@/lib/motion/storage";

const labels: Record<SyncState, string> = {
  local: "Saved on this device",
  pending: "Waiting to sync",
  synced: "Saved to Tiger Data",
  failed: "Cloud sync failed · saved on this device",
  "delete-pending": "Cloud deletion waiting to retry",
};
export default function SessionStorageStatus({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<SyncState>("local");
  useEffect(() => { void getSessionMeta(sessionId).then((meta) => setState(meta?.syncState ?? "local")); }, [sessionId]);
  return <span>{labels[state]}</span>;
}
