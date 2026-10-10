import { it, expect } from "vitest";
import { handoffResult, pendingResult } from "./result-handoff";
import { samplePair } from "./fixtures";

it("retains exercise statistics during saving and after a storage failure", async () => {
  const [session] = samplePair();
  let finish!: (error: string | null) => void;
  handoffResult(session, new Promise((resolve) => { finish = resolve; }));
  const result = pendingResult(session.id)!;
  expect(result.session.reps).toHaveLength(3);
  expect(pendingResult("another-set")).toBeNull();
  finish("Storage full");
  expect(await result.saving).toBe("Storage full");
  expect(pendingResult(session.id)?.session).toBe(session);
});

it("replaces the previous handoff with the most recent finished set", async () => {
  const [a, b] = samplePair();
  handoffResult(a, Promise.resolve(null));
  handoffResult(b, Promise.resolve(null));
  expect(pendingResult(a.id)).toBeNull();
  expect(await pendingResult(b.id)!.saving).toBeNull();
});
