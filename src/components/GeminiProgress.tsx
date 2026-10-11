"use client";
import { useState } from "react";
import type { Session } from "@/lib/motion/schema";
import { compatibility } from "@/lib/motion/compare";
import { coachContext } from "@/lib/coach-context";
import GeminiHelp from "./GeminiHelp";
export default function GeminiProgress({ sessions }: { sessions: Session[] }) {
  const [ids, setIds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const chosen = sessions.filter((s) => ids.includes(s.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const reasons = chosen.length > 1 ? [...new Set(chosen.slice(1).flatMap((s) => { const check = compatibility(chosen[0], s, true); return check.allowed ? [] : check.reasons; }))] : [];
  return <section className="panel">
    <h2>Look back at your squat sets</h2>
    <p>Choose two to five sets from the same person with a similar camera setup. They will be explained from oldest to newest.</p>
    {!sessions.length ? <p>Save at least two sets to explore changes.</p> : <fieldset><legend>Sets to include</legend>{sessions.map((s) => <label className="check" key={s.id}><input type="checkbox" checked={ids.includes(s.id)} disabled={!ids.includes(s.id) && ids.length >= 5} onChange={(e) => { setIds(e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id)); setConfirmed(false); }} />{new Date(s.createdAt).toLocaleString()} · {s.reps.length} squats · {s.source === "live" ? "Your recording" : "Sample"} · {s.capture.side} side</label>)}</fieldset>}
    {chosen.length >= 2 ? <>
      {reasons.length ? <p role="status">These sets cannot be compared: {reasons.join(" ")}</p> : <label className="check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />{chosen[0].source === "sample-synthetic" ? "I understand these are demonstration sets, not my progress." : "These sets are from the same person with a similar camera setup."}</label>}
      <GeminiHelp key={`${ids.join(",")}-${confirmed}`} sets={chosen.map(coachContext)} progress enabled={confirmed && !reasons.length} />
    </> : <p>Select at least two sets.</p>}
  </section>;
}
