import Link from "next/link";
import Brand from "./Brand";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer__nav" aria-label="Footer navigation">
        <Brand />
        <Link href="/session">Record</Link>
        <Link href="/history">History</Link>
        <Link href="/results/saved">Results</Link>
      </nav>
    </footer>
  );
}
