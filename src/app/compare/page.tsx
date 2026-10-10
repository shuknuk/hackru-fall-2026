import PageHeader from "@/components/PageHeader";
import CompareSessions from "@/components/CompareSessions";
export default function Page() {
  return (
    <main id="main" className="shell">
      <PageHeader
        title="What changed?"
        description="Compare squat depth and timing, then watch the two sets side by side."
      />
      <CompareSessions />
    </main>
  );
}
