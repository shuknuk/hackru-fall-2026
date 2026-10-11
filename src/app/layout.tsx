import type { Metadata, Viewport } from "next";
import ThemeControl from "@/components/ThemeControl";
import "./globals.css";

export const metadata: Metadata = {
  title: "Menhel Motion",
  description:
    "Understand your movement through private, local pose comparisons.",
  applicationName: "Menhel Motion",
  appleWebApp: { capable: true, title: "Menhel", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#485b37" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem('menhel-theme')==='dark'?'dark':'light'}catch{document.documentElement.dataset.theme='light'}` }} /></head>
      <body data-menhel-shell="v1">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ThemeControl />
        {children}
      </body>
    </html>
  );
}
