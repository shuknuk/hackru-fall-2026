import Link from "next/link";
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
        <Link href="/">Menhel Motion</Link>
        <a href="/session">Record</a>
        <a href="/history">History</a>
      </nav>
      <h1 className="page-title">{title}</h1>
      <p className="lede">{description}</p>
    </>
  );
}
