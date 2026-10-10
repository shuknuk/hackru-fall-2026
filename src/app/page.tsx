import Link from "next/link";
import { ArrowUpRight, Eye, Layers, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main id="main" className="shell">
      <header className="brand">
        <span className="brand-dot" aria-hidden="true" />
        MENHEL <span className="brand-sub">MOTION</span>
      </header>
      <section className="hero" aria-labelledby="title">
        <p className="eyebrow">A LITTLE MORE UNDERSTANDING, EVERY REP</p>
        <h1 id="title">
          See your movement.
          <br />
          <span>Find your rhythm.</span>
        </h1>
        <p className="lede">
          A camera, a side view, and room to move. Compare two squat sets
          through a simple skeleton replay and understandable movement
          observations.
        </p>
        <Link className="button" href="/session">
          Explore session setup <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
        <div className="actions">
          <a className="secondary-button" href="/history">
            View sample and history
          </a>
        </div>
        <p className="status">
          Local capture · Skeleton replay · Compare two attempts
        </p>
      </section>
      <section className="features" aria-label="Session flow">
        <article>
          <Eye aria-hidden="true" />
          <p className="step">01 / CAPTURE</p>
          <h2>Make movement visible</h2>
          <p>Side-view bodyweight squats with local pose estimates.</p>
        </article>
        <article>
          <Layers aria-hidden="true" />
          <p className="step">02 / COMPARE</p>
          <h2>Explore what changed</h2>
          <p>Replay two sets and compare their movement patterns.</p>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" />
          <p className="step">03 / KEEP IT LOCAL</p>
          <h2>Your space, your data</h2>
          <p>Pose data is stored on your device. No account required.</p>
        </article>
      </section>
      <footer>
        Built for everyday curiosity. Movement estimates are not a medical
        assessment.
      </footer>
    </main>
  );
}
