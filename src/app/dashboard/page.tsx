import Dashboard from "@/components/Dashboard";
import PageHeader from "@/components/PageHeader";

export default function DashboardPage() {
  return <main id="main" className="shell"><PageHeader title="Measurements over time." description="Tiger Data trends belong to this phone. Full movement replays stay here." /><Dashboard /></main>;
}
