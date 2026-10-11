import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main id="main" className="shell">
      <header className="home-header">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          MENHEL <span className="brand-sub">MOTION</span>
        </div>
        <Link className="header-link" href="/history">History</Link>
      </header>
      <section className="hero hero-layout" aria-labelledby="title">
        <div>
          <p className="eyebrow">PRIVATE SQUAT REVIEW</p>
          <h1 id="title">See how your squat moves.</h1>
          <p className="lede">
            Record from the side, review a skeleton replay, and compare two
            attempts using measurements saved on this device.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/session">
              Start a squat session <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="text-link" href="/history">Open saved sets</Link>
          </div>
          <p className="status">No account · No video upload · Local pose data</p>
        </div>
        <div className="motion-mark" aria-hidden="true">
          <span className="motion-mark__line" />
          <span className="motion-mark__joint motion-mark__joint--one" />
          <span className="motion-mark__joint motion-mark__joint--two" />
          <span className="motion-mark__joint motion-mark__joint--three" />
        </div>
      </section>
      <section className="features" aria-labelledby="flow-title">
        <div className="feature-intro">
          <p className="eyebrow">THE SESSION</p>
          <h2 id="flow-title">Three clear steps</h2>
        </div>
        <article>
          <p className="step">01</p>
          <h3>Set up the camera</h3>
          <p>Stand side-on with your whole body clearly visible.</p>
        </article>
        <article>
          <p className="step">02</p>
          <h3>Record your squats</h3>
          <p>Calibrate once, then complete each down-and-up movement.</p>
        </article>
        <article>
          <p className="step">03</p>
          <h3>Review and compare</h3>
          <p>Replay completed reps and compare saved attempts.</p>
        </article>
      </section>
      <footer>
        Built for everyday curiosity. Movement estimates are not a medical
        assessment.
      </footer>
    </main>
  );
}
