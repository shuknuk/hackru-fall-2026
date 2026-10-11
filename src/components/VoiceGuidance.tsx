"use client";
import { useEffect, useRef, useState } from "react";
import { CUES, CueGate, type Cue } from "@/lib/motion/narration";

export default function VoiceGuidance({ cue, immediate, onEnabledChange }: { cue: Cue | null; immediate: boolean; onEnabledChange: (enabled: boolean) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [spoken, setSpoken] = useState<Cue | null>(null);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const gate = useRef(new CueGate());
  useEffect(() => {
    if (!enabled || !cue) return;
    const tick = () => {
      if (document.hidden || !gate.current.next(cue, performance.now(), immediate)) return;
      const player = audio.current;
      if (!player) return;
      player.pause();
      player.src = `/narration/${cue}.mp3`;
      setSpoken(cue);
      void player.play().catch(() => {
        if (audio.current === player) setError("Voice could not play. Use the on-screen instructions or turn voice guidance off and on to retry.");
      });
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [enabled, cue, immediate]);
  useEffect(() => {
    const stop = () => { if (document.hidden) audio.current?.pause(); };
    document.addEventListener("visibilitychange", stop);
    return () => { document.removeEventListener("visibilitychange", stop); audio.current?.pause(); audio.current = null; };
  }, []);
  return <section className="panel" aria-label="Voice guidance">
    <button className="secondary-button" aria-pressed={enabled || starting} onClick={() => {
      setError("");
      if (enabled || starting) {
        audio.current?.pause();
        audio.current = null;
        setStarting(false);
        setEnabled(false);
        onEnabledChange(false);
        return;
      }
      setStarting(true);
      const player = new Audio();
      gate.current = new CueGate();
      const first = cue ?? "welcome";
      gate.current.next(first, performance.now(), true);
      player.src = `/narration/${first}.mp3`;
      audio.current = player;
      setSpoken(first);
      void player.play().then(() => {
        if (audio.current !== player) return;
        setStarting(false);
        setEnabled(true);
        onEnabledChange(true);
      }).catch(() => {
        if (audio.current !== player) return;
        setStarting(false);
        setError("Voice could not start. Check your sound settings and try again.");
      });
    }}>{starting ? "Cancel voice setup" : enabled ? "Mute voice guidance" : "Enable voice guidance"}</button>
    <p>ElevenLabs voice: River. Generated setup instructions; camera images stay on this device.</p>
    {enabled && spoken ? <p>Voice: {CUES[spoken]}</p> : null}
    {error ? <p role="status">{error}</p> : null}
  </section>;
}
