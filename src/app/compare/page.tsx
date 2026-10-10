import PageHeader from "@/components/PageHeader";
import CompareSessions from "@/components/CompareSessions";
export default function Page() {
  return (
    <main id="main" className="shell">
      <PageHeader
        title="What changed?"
        description="Compare two attempts with recorded evidence and phase-aligned movement."
      />
      <CompareSessions />
    </main>
  );
}
