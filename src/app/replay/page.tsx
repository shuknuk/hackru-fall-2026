import PageHeader from "@/components/PageHeader";
import SessionReplay from "@/components/SessionReplay";
export default function Page() {
  return (
    <main id="main" className="shell">
      <PageHeader
        title="See the whole rep."
        description="Play back your recorded landmarks and inspect the estimated movement."
      />
      <SessionReplay />
    </main>
  );
}
