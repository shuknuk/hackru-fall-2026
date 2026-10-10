import PageHeader from "@/components/PageHeader";
import SetResults from "@/components/SetResults";
export default function Page() {
  return <main id="main" className="shell"><PageHeader title="Your set results." description="Review your completed squats and movement measurements." /><SetResults /></main>;
}
