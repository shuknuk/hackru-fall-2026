import Link from "next/link";
import Brand from "./Brand";
export default function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <nav className="top-nav" aria-label="Main navigation">
        <Brand />
        <Link href="/session">Record</Link>
        <Link href="/results/saved">Results</Link>
        <Link href="/history">History</Link>
        <Link href="/dashboard">Progress</Link>
      </nav>
      <header className="page-heading">
        <h1 className="page-title">{title}</h1>
        <p className="lede">{description}</p>
      </header>
    </>
  );
}
