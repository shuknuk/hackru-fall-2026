import type { Metadata, Viewport } from "next";
import { Comfortaa } from "next/font/google";
import ThemeControl from "@/components/ThemeControl";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpotOn",
  description:
    "Understand your movement through private, local pose comparisons.",
  applicationName: "SpotOn",
  appleWebApp: { capable: true, title: "SpotOn", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#485b37", viewportFit: "cover" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={comfortaa.className} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem('menhel-theme')==='dark'?'dark':'light'}catch{document.documentElement.dataset.theme='light'}` }} /></head>
      <body data-menhel-shell="v1">
        <a className="skip-link" href="#main">Skip to content</a>
        <ThemeControl />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
