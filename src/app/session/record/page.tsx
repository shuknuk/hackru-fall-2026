import Link from "next/link";
import CaptureSession from "@/components/CaptureSession";
import WorkoutGate from "@/components/WorkoutGate";
export default function RecordSquats() {
  return (
    <main id="main" className="shell session-shell">
      <Link className="back-link" href="/session">Back to squat guide</Link>
      <p className="eyebrow">STEP 2 OF 2 - RECORD SQUATS</p>
      <h1>Set up, then squat.</h1>
      <p className="lede">Start your camera, confirm your setup, then calibrate. After your setup squat, your set starts automatically.</p>
      <WorkoutGate><CaptureSession /></WorkoutGate>
    </main>
  );
}
