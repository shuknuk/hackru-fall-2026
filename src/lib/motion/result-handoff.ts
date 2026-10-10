import type { Session } from "./schema";

// Keep an unsaved result available across client navigation, even if storage fails.
let latest: { session: Session; saving: Promise<string | null> } | null = null;
export function handoffResult(session: Session, saving: Promise<string | null>) {
  latest = { session, saving };
}
export function pendingResult(id: string) {
  return latest?.session.id === id ? latest : null;
}
