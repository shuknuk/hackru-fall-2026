"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@clerk/nextjs";

type Account = { configured: boolean; loaded: boolean; userId: string | null };
const AccountContext = createContext<Account>({ configured: false, loaded: true, userId: null });

export function ClerkAccount({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  return <AccountContext.Provider value={{ configured: true, loaded: isLoaded, userId: userId ?? null }}>{children}</AccountContext.Provider>;
}
export function GuestAccount({ children }: { children: React.ReactNode }) {
  return <AccountContext.Provider value={{ configured: false, loaded: true, userId: null }}>{children}</AccountContext.Provider>;
}
export function useAccount() { return useContext(AccountContext); }
