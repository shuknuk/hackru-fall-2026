import type { WorkoutSummary } from "@/lib/cloud/workout-summary";

export default function MeasurementTrend({ workouts, metric, label, unit }: {
  workouts: WorkoutSummary[];
  metric: "medianKneeBend" | "medianAscentMs" | "trackingCoverage";
  label: string;
  unit: string;
}) {
  const records = [...workouts].reverse();
  const values = records.map((record) => {
    const value = record[metric];
    return value === null ? null : metric === "medianAscentMs" ? value / 1000 : metric === "trackingCoverage" ? value * 100 : value;
  });
  const maximum = Math.max(1, ...values.filter((value): value is number => value !== null));
  const x = (index: number) => 30 + index * 540 / Math.max(1, records.length - 1);
  const y = (value: number) => 160 - value / maximum * 130;
  return <section className="panel">
    <h2>{label}</h2>
    {records.length ? <>
      <svg viewBox="0 0 600 190" role="img" aria-label={`${label}, oldest to newest. Values are listed below.`} style={{ width: "100%", maxHeight: 220 }}>
        <line x1="30" y1="160" x2="570" y2="160" stroke="currentColor" opacity="0.3" />
        {values.map((value, index) => value === null ? null : <g key={records[index].sessionId}>
          {index > 0 && values[index - 1] !== null ? <line x1={x(index - 1)} y1={y(values[index - 1]!)} x2={x(index)} y2={y(value)} stroke="var(--accent)" strokeWidth="2" /> : null}
          <circle cx={x(index)} cy={y(value)} r="4" fill="var(--accent)"><title>{new Date(records[index].recordedAt).toLocaleString()}: {value.toFixed(1)} {unit}</title></circle>
        </g>)}
        <text x="30" y="185" fill="currentColor" fontSize="12">Oldest</text><text x="570" y="185" textAnchor="end" fill="currentColor" fontSize="12">Newest</text>
      </svg>
      <details><summary>View measurement values</summary><ul>{records.map((record, index) => <li key={record.sessionId}>{new Date(record.recordedAt).toLocaleString()}: {values[index] === null ? "Unavailable" : `${values[index]!.toFixed(1)} ${unit}`} · {record.visibleSide} side · {record.algorithmVersion}</li>)}</ul></details>
    </> : <p>Record a set to see this measurement over time.</p>}
  </section>;
}
