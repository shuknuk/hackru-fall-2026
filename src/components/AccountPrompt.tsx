import Link from "next/link";

export default function AccountPrompt() {
  return <section className="account-prompt" aria-labelledby="account-prompt-title">
    <p className="eyebrow">KEEP YOUR MOMENTUM</p>
    <h2 id="account-prompt-title">Your five free workouts are saved.</h2>
    <p>Create a free account or sign in to record unlimited workouts. Your existing local replays and comparisons stay available.</p>
    <div className="actions"><Link className="button" href="/sign-up">Create free account</Link><Link className="secondary-button" href="/sign-in">Sign in</Link></div>
  </section>;
}
