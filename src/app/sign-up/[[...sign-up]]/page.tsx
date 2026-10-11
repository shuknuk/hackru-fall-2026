import { SignUp } from "@clerk/nextjs";
import { hasClerkConfiguration } from "@/lib/auth/config";

export default function SignUpPage() {
  return <main id="main" className="shell auth-page">
    <h1>Create your free account.</h1>
    <p>Your five local workouts stay on this device unless you explicitly import their summaries.</p>
    {hasClerkConfiguration()
      ? <SignUp fallbackRedirectUrl="/dashboard" />
      : <p role="alert">Clerk is not configured for this deployment. Add the documented Clerk environment variables and restart the app.</p>}
  </main>;
}
