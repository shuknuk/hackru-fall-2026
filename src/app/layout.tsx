import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Menhel Motion", description: "Understand your movement through private, local pose comparisons." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
