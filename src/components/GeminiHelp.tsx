"use client";
import GeminiButton from "./GeminiButton";
import { useId, useState } from "react";
import { parseHelpResponse, type HelpRequest, type HelpResponse, type HelpSet } from "@/lib/gemini-help";
const titles = { "went-well": "What went well", "next-step": "One thing to try next", explanation: "A simpler explanation", progress: "Across your sets", answer: "Your answer" };
export default function GeminiHelp({ sets, progress = false, enabled = true }: { sets: HelpSet[]; progress?: boolean; enabled?: boolean }) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [feedback, setFeedback] = useState<"bend" | "heels" | "standing">("bend");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HelpResponse | null>(null);
  const [error, setError] = useState("");
  const [diagnostics, setDiagnostics] = useState<unknown>(null);
  const [asked, setAsked] = useState("");
  const disabled = busy || !enabled;
  async function ask(mode: HelpRequest["mode"]) {
    if (disabled) return;
    const body: HelpRequest = { mode, sets, question: mode === "question" ? question.trim() : "", ...(mode === "feedback" ? { feedback } : {}) };
    setBusy(true); setResult(null); setError(""); setDiagnostics(null);
    setAsked(mode === "question" ? question.trim() : mode === "feedback" ? ({ bend: "Bending your hips and knees", heels: "Keeping your heels down", standing: "Standing back up" })[feedback] : "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch("/api/gemini-help", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      const value = await response.json();
      if (!response.ok) setDiagnostics(value.diagnostics ?? { httpStatus: response.status });
      if (!response.ok) throw new Error(typeof value?.error === "string" ? value.error : "Gemini could not respond. Please try again.");
      setResult(parseHelpResponse(value, body));
    } catch (cause) { setError(controller.signal.aborted ? "Gemini took too long. Please try again." : cause instanceof Error ? cause.message : "Gemini could not respond. Please try again."); }
    finally { clearTimeout(timer); setBusy(false); }
  }
  return <section className="coach" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">GEMINI</p>
    <h3 id={`${id}-title`}>{progress ? "Your progress, explained" : "Make sense of your set"}</h3>
    <p>{progress ? "Choose a few saved sets and get a simple explanation of what changed." : "Get a short summary, understand a feedback item, or ask about these results."}</p>
    <p>Only selected set summaries and posture-check results are sent to Google Gemini. Your question is sent too if you ask one. Video and body landmarks stay on this device. Avoid personal or medical details in your question.</p>
    <p>Pressing Analyze with Gemini sends these selected summaries to Google for this analysis.</p>
    {progress ? <GeminiButton busy={busy} disabled={disabled} onClick={() => void ask("progress")} /> : <>
      <GeminiButton busy={busy} disabled={disabled} onClick={() => void ask("summary")} />
      <details><summary>Explain a feedback item</summary>
        <label>Which feedback?<select value={feedback} disabled={busy} onChange={(e) => setFeedback(e.target.value as typeof feedback)}>
          <option value="bend">Bending your hips and knees</option><option value="heels">Keeping your heels down</option><option value="standing">Standing back up</option>
        </select></label>
        <button className="secondary-button" disabled={disabled} onClick={() => void ask("feedback")}>Explain this feedback</button>
      </details>
      <details hidden><summary>Ask about your results</summary>
        <form onSubmit={(e) => { e.preventDefault(); if (question.trim()) void ask("question"); }}>
          <label htmlFor={`${id}-question`}>Your question</label>
          <input id={`${id}-question`} value={question} maxLength={400} disabled={busy} onChange={(e) => setQuestion(e.target.value)} placeholder="What do these results tell me?" />
          <button className="secondary-button" disabled={disabled || !question.trim()} type="submit">Ask Gemini</button>
        </form>
      </details>
    </>}
    <div aria-live="polite">{busy ? <p role="status">Gemini is reading your results...</p> : null}
      {error ? <p role="alert">{error}</p> : null}{diagnostics ? <details open><summary>Gemini error details</summary><pre className="gemini-diagnostics">{JSON.stringify(diagnostics, null, 2)}</pre></details> : null}
      {result ? <div className="coach-result">{asked ? <p><strong>{asked}</strong></p> : null}{result.sections.map((s, i) => <div key={i}><h4>{titles[s.kind]}</h4><p>{s.text}</p></div>)}<p>This explanation uses estimates from one camera. It cannot confirm perfect posture or replace professional advice.</p></div> : null}
    </div>
  </section>;
}
