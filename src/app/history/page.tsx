import PageHeader from "@/components/PageHeader";
import History from "@/components/History";
export default function Page() {
  return (
    <main id="main" className="shell">
      <PageHeader
        title="Your movement library."
        description="Saved sets, sample replays and comparisons. Everything stays on this device."
      />
      <History />
    </main>
  );
}
