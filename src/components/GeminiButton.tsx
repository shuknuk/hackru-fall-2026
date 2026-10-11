"use client";
import { useId } from "react";
export default function GeminiButton({ busy, disabled, onClick }: { busy: boolean; disabled?: boolean; onClick: () => void }) {
  const gradient = useId();
  return <button className="gemini-button" disabled={disabled || busy} onClick={onClick} aria-busy={busy}>
    <span className={`gemini-orbit${busy ? " is-loading" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 32 32"><defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4285f4"/><stop offset=".5" stopColor="#9b72cb"/><stop offset="1" stopColor="#d96570"/></linearGradient></defs><path fill={`url(#${gradient})`} d="M16 1C14 11 11 14 1 16c10 2 13 5 15 15 2-10 5-13 15-15C21 14 18 11 16 1Z"/></svg>
    </span>{busy ? "Analyzing with Geminiâ€¦" : "Analyze with Gemini"}
  </button>;
}
