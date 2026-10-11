import Dashboard from "@/components/Dashboard";
import PageHeader from "@/components/PageHeader";

export default function DashboardPage() {
  return <main id="main" className="shell"><PageHeader title="My progress." description="Account workout summaries and time-series trends. Full movement replays stay on the device that recorded them." /><Dashboard /></main>;
}
