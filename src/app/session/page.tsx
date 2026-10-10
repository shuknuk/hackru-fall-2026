import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Camera } from "lucide-react";
import CaptureSession from "@/components/CaptureSession";

export default function SessionSetup() {
  return (
    <main id="main" className="shell session-shell">
      <Link className="back-link" href="/">
        <ArrowLeft size={18} aria-hidden="true" /> Back to Menhel
      </Link>
      <p className="eyebrow">SIDE-VIEW BODYWEIGHT SQUATS</p>
      <h1>Room to move.</h1>
      <p className="lede">
        Start a local camera preview and check that the skeleton follows your
        body. Keep one person in view, with room to move.
      </p>
      <section className="setup-card" aria-labelledby="setup-title">
        <Camera size={36} aria-hidden="true" />
        <h2 id="setup-title">Side-view squat setup</h2>
        <ol>
          <li>Place your device securely at hip height.</li>
          <li>Stand side-on with your full body in the frame.</li>
          <li>Use a clear, well-lit space with room to move comfortably.</li>
        </ol>
        <p className="status">
          Calibrate your comfortable range before recording. Movement estimates
          are not a medical assessment.
        </p>
      </section>
      <section className="panel movement-guide" aria-labelledby="movement-guide-title">
        <p className="eyebrow">VISUAL SETUP GUIDE</p>
        <h2 id="movement-guide-title">One comfortable down-and-up cycle</h2>
        <p>
          Use these poses to recognize the start and turn of the movement. They
          are an orientation guide, not a required depth or scoring target.
        </p>
        <div className="guide-poses">
          <figure>
            <Image
              src="/exercises/bodyweight-squat-start.webp"
              alt="Illustration of the standing start position for a bodyweight squat"
              width={512}
              height={512}
              unoptimized
            />
            <figcaption>Start and finish standing comfortably.</figcaption>
          </figure>
          <figure>
            <Image
              src="/exercises/bodyweight-squat-peak.webp"
              alt="Illustration of the lowered turning position for a bodyweight squat"
              width={512}
              height={512}
              unoptimized
            />
            <figcaption>Turn at your own comfortable depth, then stand.</figcaption>
          </figure>
        </div>
        <p className="status">
          Exercise illustrations by{" "}
          <a href="https://repdb.co" rel="noreferrer">
            RepDB (repdb.co)
          </a>
          .
        </p>
      </section>
      <CaptureSession />
    </main>
  );
}
