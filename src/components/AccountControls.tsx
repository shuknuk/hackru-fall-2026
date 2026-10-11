"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useAccount } from "./AuthContext";

export default function AccountControls() {
  const account = useAccount();
  if (!account.loaded) return <span className="account-status">Checking account…</span>;
  if (account.userId) return <div className="account-controls"><Link href="/dashboard">My progress</Link><UserButton userProfileMode="navigation" userProfileUrl="/account" /></div>;
  return <div className="account-controls"><Link href="/sign-in">Sign in</Link><Link className="account-create" href="/sign-up">Create free account</Link></div>;
}
