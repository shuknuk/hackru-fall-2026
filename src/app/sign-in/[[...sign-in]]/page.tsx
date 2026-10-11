import { SignIn } from "@clerk/nextjs";
import { hasClerkConfiguration } from "@/lib/auth/config";

export default function SignInPage() {
  return <main id="main" className="shell auth-page">
    <h1>Welcome back.</h1>
    {hasClerkConfiguration()
      ? <SignIn fallbackRedirectUrl="/dashboard" />
      : <p role="alert">Clerk is not configured for this deployment. Add the documented Clerk environment variables and restart the app.</p>}
  </main>;
}
