import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import PoseSpike from "@/components/PoseSpike";

export default function SessionSetup() {
  return <main id="main" className="shell session-shell">
    <Link className="back-link" href="/"><ArrowLeft size={18} aria-hidden="true" /> Back to Menhel</Link>
    <p className="eyebrow">SESSION SETUP / DEVELOPMENT PREVIEW</p>
    <h1>Room to move.</h1>
    <p className="lede">Start a local camera preview and check that the skeleton follows your body. Keep one person in view, with room to move.</p>
    <section className="setup-card" aria-labelledby="setup-title">
      <Camera size={36} aria-hidden="true" /><h2 id="setup-title">Side-view squat setup</h2>
      <ol><li>Place your device securely at hip height.</li><li>Stand side-on with your full body in the frame.</li><li>Use a clear, well-lit space with room to move comfortably.</li></ol>
      <p className="status">Calibration and rep counting come after this live tracking spike passes.</p>
    </section>
    <PoseSpike />
  </main>;
}
