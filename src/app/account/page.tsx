import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { hasClerkConfiguration } from "@/lib/auth/config";

export default function AccountPage() {
  return <main id="main" className="shell auth-page">
    <h1>Your account.</h1>
    <p><Link href="/dashboard">Open My progress</Link></p>
    {hasClerkConfiguration()
      ? <UserProfile />
      : <p role="alert">Clerk is not configured for this deployment.</p>}
  </main>;
}
