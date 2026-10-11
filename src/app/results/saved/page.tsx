import PageHeader from "@/components/PageHeader";
import SavedResults from "@/components/SavedResults";

export default function SavedResultsPage() {
  return <main id="main" className="shell">
    <PageHeader title="Saved results" description="Return to any completed set, review its measurements, or watch the replay again." />
    <SavedResults />
  </main>;
}
